import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.resource import ResourceCreate, ResourceListItem, ResourceRead, ResourceUpdate
from app.services import credibility_service, resource_service, social_signal_service

router = APIRouter(prefix="/resources", tags=["Resources"])

DbDep = Annotated[AsyncSession, Depends(get_db)]


@router.get("/", response_model=list[ResourceListItem])
async def list_resources(
    db: DbDep,
    skill_id: int | None = Query(default=None, description="Filter by skill ID"),
    provider: str | None = Query(default=None),
    resource_type: str | None = Query(default=None),
    difficulty: str | None = Query(default=None),
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
):
    items, _ = await resource_service.list_resources(
        db,
        skill_id=skill_id,
        provider=provider,
        resource_type=resource_type,
        difficulty=difficulty,
        offset=offset,
        limit=limit,
    )
    return items


@router.get("/search", response_model=list[ResourceListItem])
async def search_resources(
    db: DbDep,
    q: str = Query(..., min_length=2, description="Search query"),
    limit: int = Query(default=20, ge=1, le=100),
):
    return await resource_service.search_resources(db, query=q, limit=limit)


@router.get("/skill/{skill_id}", response_model=list[ResourceListItem])
async def resources_for_skill(
    skill_id: int,
    db: DbDep,
    limit: int = Query(default=20, ge=1, le=100),
):
    items, _ = await resource_service.list_resources(db, skill_id=skill_id, limit=limit)
    return items


@router.get("/{resource_id}", response_model=ResourceRead)
async def get_resource(resource_id: uuid.UUID, db: DbDep):
    resource = await resource_service.get_resource(db, resource_id)
    if not resource:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")
    return resource


@router.post("/", response_model=ResourceRead, status_code=status.HTTP_201_CREATED)
async def create_resource(payload: ResourceCreate, db: DbDep):
    resource = await resource_service.create_resource(db, payload)
    await db.commit()
    await db.refresh(resource)
    return resource


@router.patch("/{resource_id}", response_model=ResourceRead)
async def update_resource(resource_id: uuid.UUID, payload: ResourceUpdate, db: DbDep):
    resource = await resource_service.get_resource(db, resource_id)
    if not resource:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")
    resource = await resource_service.update_resource(db, resource, payload)
    await db.commit()
    await db.refresh(resource)
    return resource


@router.post("/{resource_id}/validate", response_model=dict)
async def validate_resource_credibility(resource_id: uuid.UUID, db: DbDep):
    """
    Trigger the full credibility pipeline for a single resource:
    1. Collect Reddit + X social signals
    2. Run VADER + Gemini sentiment analysis
    3. Compute composite credibility score
    """
    resource = await resource_service.get_resource(db, resource_id)
    if not resource:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")

    new_signals = await social_signal_service.collect_and_store_signals(
        db,
        resource_id=resource.id,
        resource_title=resource.title,
        resource_url=resource.url,
    )

    score = await credibility_service.compute_and_store_credibility(db, resource.id)
    await db.commit()

    return {
        "resource_id": str(resource_id),
        "new_signals_collected": new_signals,
        "credibility_score": score,
    }
