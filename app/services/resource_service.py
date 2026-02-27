"""
Resource service — CRUD and business logic for the Resource model.
"""

import logging
import uuid
from datetime import datetime, timezone

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.resource import Resource, ResourceSkillLink
from app.models.skill import Skill
from app.schemas.resource import ResourceCreate, ResourceUpdate
from app.scrapers.base import ScrapedResource

logger = logging.getLogger(__name__)


async def get_resource(db: AsyncSession, resource_id: uuid.UUID) -> Resource | None:
    result = await db.execute(
        select(Resource)
        .where(Resource.id == resource_id)
        .options(selectinload(Resource.skill_links).selectinload(ResourceSkillLink.skill))
    )
    return result.scalar_one_or_none()


async def list_resources(
    db: AsyncSession,
    *,
    skill_id: int | None = None,
    provider: str | None = None,
    resource_type: str | None = None,
    difficulty: str | None = None,
    offset: int = 0,
    limit: int = 20,
) -> tuple[list[Resource], int]:
    """Returns (items, total_count)."""
    query = select(Resource).where(Resource.is_active == True)

    if skill_id is not None:
        query = query.join(ResourceSkillLink).where(ResourceSkillLink.skill_id == skill_id)
    if provider:
        query = query.where(Resource.provider.ilike(f"%{provider}%"))
    if resource_type:
        query = query.where(Resource.resource_type == resource_type)
    if difficulty:
        query = query.where(Resource.difficulty == difficulty)

    # Ordered by credibility, then by creation date
    query = query.order_by(
        Resource.credibility_score.desc().nullslast(),
        Resource.created_at.desc(),
    )

    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar_one()

    items = (await db.execute(query.offset(offset).limit(limit))).scalars().all()
    return list(items), total


async def search_resources(
    db: AsyncSession, query: str, limit: int = 20
) -> list[Resource]:
    """Full-text search on title and description."""
    result = await db.execute(
        select(Resource)
        .where(
            Resource.is_active == True,
            or_(
                Resource.title.ilike(f"%{query}%"),
                Resource.description.ilike(f"%{query}%"),
            ),
        )
        .order_by(Resource.credibility_score.desc().nullslast())
        .limit(limit)
    )
    return list(result.scalars().all())


async def create_resource(
    db: AsyncSession, payload: ResourceCreate
) -> Resource:
    resource = Resource(
        title=payload.title,
        url=payload.url,
        description=payload.description,
        provider=payload.provider,
        resource_type=payload.resource_type,
        difficulty=payload.difficulty,
        cost=payload.cost,
        duration_minutes=payload.duration_minutes,
        platform_rating=payload.platform_rating,
        enrollment_count=payload.enrollment_count,
        is_manually_curated=payload.is_manually_curated,
    )
    db.add(resource)
    await db.flush()  # get ID before linking skills

    for skill_id in payload.skill_ids:
        db.add(ResourceSkillLink(resource_id=resource.id, skill_id=skill_id))

    await db.flush()
    return resource


async def update_resource(
    db: AsyncSession, resource: Resource, payload: ResourceUpdate
) -> Resource:
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(resource, field, value)
    resource.updated_at = datetime.now(timezone.utc)
    await db.flush()
    return resource


async def upsert_scraped(
    db: AsyncSession, scraped: ScrapedResource, skill_ids: list[int] | None = None
) -> tuple[Resource, bool]:
    """
    Insert a scraped resource, or update metadata if the URL already exists.
    Returns (resource, created: bool).
    """
    result = await db.execute(select(Resource).where(Resource.url == scraped.url))
    existing = result.scalar_one_or_none()

    if existing:
        # Update mutable fields
        existing.title = scraped.title
        existing.description = scraped.description or existing.description
        existing.platform_rating = scraped.platform_rating or existing.platform_rating
        existing.enrollment_count = scraped.enrollment_count or existing.enrollment_count
        existing.duration_minutes = scraped.duration_minutes or existing.duration_minutes
        existing.scraped_at = scraped.scraped_at
        existing.updated_at = datetime.now(timezone.utc)
        await db.flush()
        return existing, False

    resource = Resource(
        title=scraped.title,
        url=scraped.url,
        provider=scraped.provider,
        resource_type=scraped.resource_type,
        description=scraped.description,
        difficulty=scraped.difficulty,
        cost=scraped.cost,
        duration_minutes=scraped.duration_minutes,
        platform_rating=scraped.platform_rating,
        enrollment_count=scraped.enrollment_count,
        scraped_at=scraped.scraped_at,
    )
    db.add(resource)
    await db.flush()

    if skill_ids:
        for sid in skill_ids:
            db.add(ResourceSkillLink(resource_id=resource.id, skill_id=sid))
        await db.flush()

    return resource, True


async def resolve_skill_ids(db: AsyncSession, skill_tags: list[str]) -> list[int]:
    """Look up skill IDs by name (case-insensitive). Returns matched IDs."""
    if not skill_tags:
        return []
    result = await db.execute(
        select(Skill.id).where(
            or_(*[Skill.canonical_name.ilike(tag) for tag in skill_tags])
        )
    )
    return [row[0] for row in result.fetchall()]
