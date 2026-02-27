"""
Dev.to scraper — uses the official dev.to/Forem public REST API.
No Playwright needed.
"""

import logging

import httpx

from app.scrapers.base import ScrapedResource

logger = logging.getLogger(__name__)

_ARTICLES_URL = "https://dev.to/api/articles"


def _estimate_duration(reading_time_minutes: int | None) -> int | None:
    return reading_time_minutes


def _is_relevant(query: str, title: str, description: str | None, tags: list[str]) -> bool:
    """Check if an article is relevant to the search query."""
    query_lower = query.lower()
    query_keywords = set(query_lower.split())
    
    # Check title
    title_lower = title.lower()
    if any(keyword in title_lower for keyword in query_keywords):
        return True
    
    # Check description
    if description:
        desc_lower = description.lower()
        if any(keyword in desc_lower for keyword in query_keywords):
            return True
    
    # Check tags
    tags_lower = " ".join(tags).lower()
    if any(keyword in tags_lower for keyword in query_keywords):
        return True
    
    return False


class DevToScraper:
    """
    Fetches articles from dev.to using the free public Forem API.
    Docs: https://developers.forem.com/api/v1#tag/articles
    """

    PROVIDER = "Dev.to"

    async def scrape(self, query: str, max_results: int = 10) -> list[ScrapedResource]:
        results: list[ScrapedResource] = []

        async with httpx.AsyncClient(timeout=20) as client:
            # Fetch more articles than needed to account for relevance filtering
            resp = await client.get(
                _ARTICLES_URL,
                params={
                    "tag": query.split()[0],  # Use first keyword as tag filter
                    "per_page": max_results * 3,  # Fetch 3x to compensate for filtering
                },
                headers={"Accept": "application/vnd.forem.api-v1+json"},
            )
            resp.raise_for_status()
            articles = resp.json()

        for article in articles:
            if len(results) >= max_results:
                break
                
            try:
                title: str = article.get("title", "").strip()
                url: str = article.get("url", "").strip()
                if not title or not url:
                    continue

                description = article.get("description", "")
                reading_time: int | None = article.get("reading_time_minutes")
                reactions: int = article.get("public_reactions_count", 0)
                tag_list: list[str] = article.get("tag_list", [])
                cover_image: str | None = article.get("cover_image")

                # Filter by relevance
                if not _is_relevant(query, title, description, tag_list):
                    logger.debug(f"Dev.to: Skipping irrelevant article: {title}")
                    continue

                results.append(
                    ScrapedResource(
                        title=title,
                        url=url,
                        provider=self.PROVIDER,
                        resource_type="article",
                        description=description[:400] if description else None,
                        cost="Free",
                        duration_minutes=_estimate_duration(reading_time),
                        platform_rating=None,
                        enrollment_count=reactions,  # repurpose as engagement proxy
                        thumbnail_url=cover_image,
                        skill_tags=[query] + tag_list[:5],
                    )
                )
            except Exception as e:
                logger.warning("Dev.to: failed to parse article — %s", e)
                continue

        logger.info("Dev.to scrape complete: %d results for '%s'", len(results), query)
        return results
