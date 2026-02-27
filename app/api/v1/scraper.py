"""
Scraper router — triggers on-demand resource scraping for a given skill/query.
Runs all platform scrapers concurrently and upserts results into the DB.
Also provides roadmap generation endpoint for real-time learning path creation.
"""

import asyncio
import logging
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.scrapers.base import ScrapedResource
from app.scrapers.coursera import CourseraScraper
from app.scrapers.dev_to import DevToScraper
from app.scrapers.medium import MediumScraper
from app.scrapers.udemy import UdemyScraper
from app.scrapers.youtube import YouTubeScraper
from app.schemas.roadmap import RoadmapResponse
from app.services import credibility_service, resource_service, social_signal_service
from app.services.roadmap_service import get_roadmap_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/scrape", tags=["Scraper"])

DbDep = Annotated[AsyncSession, Depends(get_db)]


async def _run_all_scrapers(query: str, max_per_source: int) -> list[ScrapedResource]:
    """
    Run all platform scrapers concurrently. Playwright-based scrapers are
    each run in their own context (via async with) so they don't share state.
    """
    async def safe_run(coro):
        try:
            return await coro
        except Exception as e:
            logger.warning("Scraper failed: %s", e)
            return []

    results = await asyncio.gather(
        safe_run(UdemyScraper().scrape(query, max_per_source)),
        safe_run(YouTubeScraper().scrape(query, max_per_source)),
        safe_run(MediumScraper().scrape(query, max_per_source)),
        safe_run(DevToScraper().scrape(query, max_per_source)),
        safe_run(CourseraScraper().scrape(query, max_per_source)),
    )

    flat: list[ScrapedResource] = []
    for batch in results:
        flat.extend(batch)
    return flat


async def _scrape_and_validate(db: AsyncSession, query: str, max_per_source: int) -> dict:
    """Full pipeline: scrape → upsert → collect social signals → score credibility."""
    scraped = await _run_all_scrapers(query, max_per_source)

    created_count = 0
    updated_count = 0

    for item in scraped:
        skill_ids = await resource_service.resolve_skill_ids(db, item.skill_tags)
        resource, was_created = await resource_service.upsert_scraped(db, item, skill_ids)

        if was_created:
            created_count += 1
            # Collect social signals for new resources only (expensive)
            await social_signal_service.collect_and_store_signals(
                db,
                resource_id=resource.id,
                resource_title=resource.title,
                resource_url=resource.url,
            )
            await credibility_service.compute_and_store_credibility(db, resource.id)
        else:
            updated_count += 1

    await db.commit()
    return {
        "query": query,
        "scraped_total": len(scraped),
        "created": created_count,
        "updated": updated_count,
    }


@router.post("/", status_code=status.HTTP_202_ACCEPTED)
async def trigger_scrape(
    background_tasks: BackgroundTasks,
    db: DbDep,
    query: str = Query(..., min_length=2, description="Skill or topic to scrape"),
    max_per_source: int = Query(default=5, ge=1, le=20),
    run_async: bool = Query(
        default=True,
        description="If true, run in background and return immediately. "
                    "If false, wait and return results.",
    ),
):
    """
    Trigger scraping for a skill query across all platforms.

    - Scrapes Udemy, YouTube, Medium, Dev.to, Coursera
    - Collects Reddit + X social signals for new resources
    - Runs sentiment analysis and computes credibility scores
    """
    if run_async:
        background_tasks.add_task(_scrape_and_validate, db, query, max_per_source)
        return {"status": "queued", "query": query, "message": "Scraping started in background"}

    result = await _scrape_and_validate(db, query, max_per_source)
    return {"status": "completed", **result}


@router.post("/bulk", status_code=status.HTTP_202_ACCEPTED)
async def trigger_bulk_scrape(
    background_tasks: BackgroundTasks,
    db: DbDep,
    queries: list[str],
    max_per_source: int = Query(default=5, ge=1, le=10),
):
    """Trigger scraping for multiple skill queries at once."""
    if not queries:
        return {"status": "noop", "message": "No queries provided"}
    if len(queries) > 20:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Maximum 20 queries per bulk request")

    async def run_all(db: AsyncSession):
        for q in queries:
            await _scrape_and_validate(db, q, max_per_source)

    background_tasks.add_task(run_all, db)
    return {
        "status": "queued",
        "queries": queries,
        "message": f"Bulk scraping {len(queries)} queries started in background",
    }


@router.post("/recompute-credibility", status_code=status.HTTP_202_ACCEPTED)
async def recompute_all_credibility(background_tasks: BackgroundTasks, db: DbDep):
    """Recompute credibility scores for all active resources."""
    background_tasks.add_task(credibility_service.bulk_recompute, db)
    return {"status": "queued", "message": "Credibility recompute started in background"}


# ─────────────────────────────────────────────────────────────────────────────
# Roadmap Generation Endpoints (Real-time, no DB storage)
# ─────────────────────────────────────────────────────────────────────────────


@router.get("/roadmap", response_model=RoadmapResponse, status_code=status.HTTP_200_OK)
async def generate_learning_roadmap(
    query: str = Query(
        ...,
        min_length=2,
        max_length=200,
        description="Learning goal or topic (e.g., 'full stack development', 'data science')",
        examples=["full stack development"],
    ),
    starting_milestone: str = Query(
        default="beginner",
        pattern="^(beginner|intermediate|advanced)$",
        description="Your current knowledge level (beginner/intermediate/advanced)",
        examples=["beginner", "intermediate", "advanced"],
    ),
    max_results_per_platform: int = Query(
        default=15, ge=1, le=30, description="Max results per platform"
    ),
    include_social_signals: bool = Query(
        default=True, description="Include Reddit discussions"
    ),
    min_resources_per_milestone: int = Query(
        default=12,
        ge=5,
        le=50,
        description="Minimum resources per milestone (beginner, intermediate, advanced)",
    ),
):
    """
    Generate a comprehensive learning roadmap organized by difficulty milestones.

    **Platforms scraped:**
    - **Coursera** - Courses with ratings, difficulty, duration, enrollments
    - **Udemy** - Courses via AI-powered Exa search (bypasses Cloudflare)
    - **YouTube** - Video tutorials with views, duration, and difficulty
    - **Medium** - Articles and tutorials  
    - **Dev.to** - Technical articles and developer guides
    - **Reddit** - Community discussions and recommendations (optional)

    **Learning Milestones:**
    The roadmap is personalized based on your `starting_milestone`:
    - **beginner**: Returns beginner → intermediate → advanced resources
    - **intermediate**: Returns only intermediate → advanced resources (skips beginner)
    - **advanced**: Returns only advanced resources

    Each milestone contains 12+ resources for comprehensive learning.

    **Returns:**
    - Resources organized by difficulty milestones
    - Social signals for credibility assessment
    - Metadata about scraping success/failures

    **Note:** This endpoint scrapes platforms in real-time and does NOT store
    results in the database. For persistent storage, use `/scrape` endpoint instead.
    """
    try:
        logger.info(f"Generating milestone-based roadmap for: '{query}' starting from '{starting_milestone}'")

        # Get the roadmap service
        service = get_roadmap_service()

        # Generate roadmap by scraping all platforms
        result = await service.generate_roadmap(
            query=query,
            starting_milestone=starting_milestone,
            max_results_per_platform=max_results_per_platform,
            include_social_signals=include_social_signals,
            min_resources_per_milestone=min_resources_per_milestone,
        )

        # Convert to response format
        def resource_to_dict(resource):
            return {
                "title": resource.title,
                "url": resource.url,
                "provider": resource.provider,
                "resource_type": resource.resource_type,
                "description": resource.description,
                "difficulty": resource.difficulty,
                "cost": resource.cost,
                "duration_minutes": resource.duration_minutes,
                "platform_rating": resource.platform_rating,
                "enrollment_count": resource.enrollment_count,
                "thumbnail_url": resource.thumbnail_url,
                "skill_tags": resource.skill_tags,
            }

        def signal_to_dict(signal):
            return {
                "source": signal.source,
                "source_url": signal.source_url,
                "author": signal.author,
                "content_snippet": signal.content_snippet,
                "subreddit": signal.subreddit if hasattr(signal, "subreddit") else None,
                "upvotes": signal.upvotes,
                "downvotes": signal.downvotes,
            }

        # Convert milestones to dict format
        milestones_dict = {
            milestone: [resource_to_dict(r) for r in resources]
            for milestone, resources in result.milestones.items()
        }

        return RoadmapResponse(
            query=result.query,
            milestones=milestones_dict,
            social_signals=[signal_to_dict(s) for s in result.social_signals],
            total_resources=result.total_resources,
            platforms_scraped=result.platforms_scraped,
            metadata=result.metadata,
        )

    except Exception as e:
        logger.error(f"Roadmap generation failed: {e}", exc_info=True)
        from fastapi import HTTPException

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate roadmap: {str(e)}",
        )


@router.get("/roadmap/health")
async def roadmap_service_health():
    """Check if roadmap service and all scrapers are initialized."""
    try:
        service = get_roadmap_service()

        scrapers_status = {
            "coursera": hasattr(service, "coursera") and service.coursera is not None,
            "udemy": hasattr(service, "udemy") and service.udemy is not None,
            "youtube": hasattr(service, "youtube") and service.youtube is not None,
            "devto": hasattr(service, "devto") and service.devto is not None,
            "medium": hasattr(service, "medium") and service.medium is not None,
            "reddit": hasattr(service, "reddit") and service.reddit is not None,
        }

        operational_count = sum(scrapers_status.values())
        total_count = len(scrapers_status)

        return {
            "status": "healthy" if operational_count >= 4 else "degraded",
            "scrapers": scrapers_status,
            "operational": f"{operational_count}/{total_count}",
            "message": (
                "All systems operational"
                if operational_count == total_count
                else f"Some scrapers unavailable ({operational_count}/{total_count} working)"
            ),
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {
            "status": "unhealthy",
            "error": str(e),
            "message": "Roadmap service not available",
        }
