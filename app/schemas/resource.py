import uuid
from datetime import datetime

from pydantic import BaseModel, HttpUrl, Field

from app.models.resource import CostType, DifficultyLevel, ResourceType


class ResourceCreate(BaseModel):
    title: str = Field(..., max_length=512)
    url: str = Field(..., max_length=2048)
    description: str | None = None
    provider: str = Field(..., max_length=128)
    resource_type: ResourceType
    difficulty: DifficultyLevel | None = None
    cost: CostType = CostType.free
    duration_minutes: int | None = None
    platform_rating: float | None = Field(default=None, ge=0, le=5)
    enrollment_count: int | None = None
    is_manually_curated: bool = False
    skill_ids: list[int] = []


class ResourceUpdate(BaseModel):
    title: str | None = Field(default=None, max_length=512)
    description: str | None = None
    difficulty: DifficultyLevel | None = None
    cost: CostType | None = None
    duration_minutes: int | None = None
    platform_rating: float | None = Field(default=None, ge=0, le=5)
    is_active: bool | None = None


class ResourceListItem(BaseModel):
    id: uuid.UUID
    title: str
    url: str
    provider: str
    resource_type: ResourceType
    difficulty: DifficultyLevel | None
    cost: CostType
    platform_rating: float | None
    credibility_score: float | None
    is_manually_curated: bool

    model_config = {"from_attributes": True}


class ResourceRead(ResourceListItem):
    description: str | None
    duration_minutes: int | None
    enrollment_count: int | None
    completion_rate: float | None
    credibility_updated_at: datetime | None
    scraped_at: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
