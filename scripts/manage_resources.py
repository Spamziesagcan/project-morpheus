"""
manage_resources.py — CLI for adding, listing, and deactivating resources.

Usage examples:
    # List all resources
    python scripts/manage_resources.py list

    # Add a single resource interactively
    python scripts/manage_resources.py add

    # Add from a JSON file
    python scripts/manage_resources.py add --file path/to/resources.json

    # Trigger scraping for a skill
    python scripts/manage_resources.py scrape --query "Docker"

    # Recompute all credibility scores
    python scripts/manage_resources.py recompute-scores
"""

import asyncio
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

import argparse

from sqlalchemy import select

from app.database import AsyncSessionLocal, create_all_tables
from app.models.resource import CostType, DifficultyLevel, Resource, ResourceSkillLink, ResourceType
from app.models.skill import Skill
from app.scrapers.coursera import CourseraScraper
from app.scrapers.dev_to import DevToScraper
from app.scrapers.medium import MediumScraper
from app.scrapers.udemy import UdemyScraper
from app.scrapers.youtube import YouTubeScraper
from app.services import credibility_service, resource_service, social_signal_service


# ── list ──────────────────────────────────────────────────────────────────────

async def cmd_list(args) -> None:
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Resource)
            .where(Resource.is_active == True)
            .order_by(Resource.credibility_score.desc().nullslast())
            .limit(args.limit)
        )
        resources = result.scalars().all()
        print(f"\n{'ID':<38} {'Score':>6} {'Provider':<20} {'Title'}")
        print("-" * 100)
        for r in resources:
            score = f"{r.credibility_score:.2f}" if r.credibility_score is not None else "  N/A"
            print(f"{str(r.id):<38} {score:>6} {r.provider:<20} {r.title[:50]}")
    print(f"\nTotal shown: {len(resources)}")


# ── add ───────────────────────────────────────────────────────────────────────

async def _add_single_resource(db, data: dict) -> Resource:
    skill_tags = data.pop("skills", [])

    resource = Resource(
        title=data["title"],
        url=data["url"],
        provider=data.get("provider", "Unknown"),
        resource_type=ResourceType(data.get("resource_type", "article")),
        description=data.get("description"),
        difficulty=DifficultyLevel(data["difficulty"]) if data.get("difficulty") else None,
        cost=CostType(data.get("cost", "Free")),
        duration_minutes=data.get("duration_minutes"),
        platform_rating=data.get("platform_rating"),
        enrollment_count=data.get("enrollment_count"),
        is_manually_curated=data.get("is_manually_curated", True),
    )
    db.add(resource)
    await db.flush()

    for tag in skill_tags:
        result = await db.execute(
            select(Skill).where(Skill.canonical_name.ilike(tag))
        )
        skill = result.scalar_one_or_none()
        if skill:
            db.add(ResourceSkillLink(resource_id=resource.id, skill_id=skill.id))

    await db.commit()
    return resource


async def cmd_add(args) -> None:
    if args.file:
        with open(args.file) as f:
            items = json.load(f)
        if isinstance(items, dict):
            items = [items]
        async with AsyncSessionLocal() as db:
            for item in items:
                r = await _add_single_resource(db, item)
                print(f"  + Added: [{r.id}] {r.title}")
        print(f"\nAdded {len(items)} resource(s).")
    else:
        # Interactive mode
        print("Add a resource interactively (Ctrl+C to cancel)\n")
        data = {
            "title": input("Title: ").strip(),
            "url": input("URL: ").strip(),
            "provider": input("Provider (e.g. YouTube, Udemy): ").strip(),
            "resource_type": input("Type [course/video/article/documentation/project/book]: ").strip(),
            "difficulty": input("Difficulty [Beginner/Intermediate/Advanced] (optional): ").strip() or None,
            "cost": input("Cost [Free/Paid/Subscription] (default: Free): ").strip() or "Free",
            "duration_minutes": int(x) if (x := input("Duration in minutes (optional): ").strip()) else None,
            "platform_rating": float(x) if (x := input("Rating 0-5 (optional): ").strip()) else None,
            "description": input("Description (optional): ").strip() or None,
            "skills": [s.strip() for s in input("Skills (comma-separated canonical names): ").split(",") if s.strip()],
            "is_manually_curated": True,
        }
        async with AsyncSessionLocal() as db:
            r = await _add_single_resource(db, data)
        print(f"\nAdded resource: [{r.id}] {r.title}")


# ── scrape ────────────────────────────────────────────────────────────────────

async def cmd_scrape(args) -> None:
    query = args.query
    max_per = args.max_per_source
    print(f"\nScraping '{query}' (max {max_per} per source)…\n")

    scrapers = [
        UdemyScraper(),
        YouTubeScraper(),
        MediumScraper(),
        DevToScraper(),
        CourseraScraper(),
    ]

    all_results = []
    for scraper in scrapers:
        name = scraper.__class__.__name__
        try:
            results = await scraper.scrape(query, max_results=max_per)
            print(f"  {name}: {len(results)} results")
            all_results.extend(results)
        except Exception as e:
            print(f"  {name}: FAILED — {e}")

    print(f"\nTotal scraped: {len(all_results)}")

    async with AsyncSessionLocal() as db:
        created = 0
        for item in all_results:
            skill_ids = await resource_service.resolve_skill_ids(db, item.skill_tags)
            resource, was_created = await resource_service.upsert_scraped(db, item, skill_ids)
            if was_created:
                created += 1
                await social_signal_service.collect_and_store_signals(
                    db,
                    resource_id=resource.id,
                    resource_title=resource.title,
                    resource_url=resource.url,
                )
                await credibility_service.compute_and_store_credibility(db, resource.id)
        await db.commit()

    print(f"Done. {created} new resources created, {len(all_results) - created} updated.")


# ── recompute-scores ──────────────────────────────────────────────────────────

async def cmd_recompute(args) -> None:
    print("Recomputing credibility scores for all active resources…")
    async with AsyncSessionLocal() as db:
        updated = await credibility_service.bulk_recompute(db)
    print(f"Done. {updated} resources updated.")


# ── CLI setup ─────────────────────────────────────────────────────────────────

def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="SkillPath AI — Resource Manager")
    sub = parser.add_subparsers(dest="command")

    # list
    p_list = sub.add_parser("list", help="List all active resources")
    p_list.add_argument("--limit", type=int, default=50)

    # add
    p_add = sub.add_parser("add", help="Add a resource (interactive or from file)")
    p_add.add_argument("--file", type=str, default=None, help="Path to JSON file")

    # scrape
    p_scrape = sub.add_parser("scrape", help="Scrape resources for a skill query")
    p_scrape.add_argument("--query", type=str, required=True)
    p_scrape.add_argument("--max-per-source", type=int, default=5, dest="max_per_source")

    # recompute-scores
    sub.add_parser("recompute-scores", help="Recompute credibility scores for all resources")

    return parser


async def main() -> None:
    await create_all_tables()
    parser = build_parser()
    args = parser.parse_args()

    commands = {
        "list": cmd_list,
        "add": cmd_add,
        "scrape": cmd_scrape,
        "recompute-scores": cmd_recompute,
    }

    if args.command not in commands:
        parser.print_help()
        return

    await commands[args.command](args)


if __name__ == "__main__":
    asyncio.run(main())
