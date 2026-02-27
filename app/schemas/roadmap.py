"""Schemas for roadmap/learning path generation."""
from typing import Any

from pydantic import BaseModel, Field

from app.schemas.resource import ResourceListItem


class SocialSignalItem(BaseModel):
    """Social signal from Reddit."""

    source: str
    source_url: str
    author: str
    content_snippet: str
    subreddit: str | None = None
    upvotes: int
    downvotes: int = 0

    class Config:
        from_attributes = True


class RoadmapRequest(BaseModel):
    """Request to generate a learning roadmap."""

    query: str = Field(
        ...,
        min_length=2,
        max_length=200,
        description="Learning goal or topic (e.g., 'full stack development', 'data science')",
        examples=["full stack development", "cloud deployment", "data engineering"],
    )
    starting_milestone: str = Field(
        default="beginner",
        pattern="^(beginner|intermediate|advanced)$",
        description="Your current knowledge level. Only milestones from this level onwards will be included.",
        examples=["beginner", "intermediate", "advanced"],
    )
    max_results_per_platform: int = Field(
        default=15,
        ge=1,
        le=30,
        description="Maximum results to fetch from each platform",
    )
    include_social_signals: bool = Field(
        default=True, description="Whether to include Reddit social signals"
    )
    min_resources_per_milestone: int = Field(
        default=12,
        ge=5,
        le=50,
        description="Minimum resources required per milestone (beginner, intermediate, advanced)",
    )


class RoadmapResponse(BaseModel):
    """Learning roadmap with resources organized by difficulty milestones."""

    query: str
    milestones: dict[str, list[dict[str, Any]]] = Field(
        description="Resources organized by difficulty: beginner, intermediate, advanced"
    )
    social_signals: list[dict[str, Any]] = Field(
        description="Community discussions from Reddit"
    )
    total_resources: int
    platforms_scraped: list[str]
    metadata: dict[str, Any]


class RoadmapSummary(BaseModel):
    """Summary statistics for a generated roadmap."""

    beginner_resources: int
    intermediate_resources: int
    advanced_resources: int
    total_social_signals: int
    total_resources: int
    platforms_scraped: int
    platforms_with_results: list[str]
