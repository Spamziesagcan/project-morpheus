import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class ResourceType(str, enum.Enum):
    video = "video"
    course = "course"
    article = "article"
    documentation = "documentation"
    project = "project"
    book = "book"


class DifficultyLevel(str, enum.Enum):
    beginner = "Beginner"
    intermediate = "Intermediate"
    advanced = "Advanced"


class CostType(str, enum.Enum):
    free = "Free"
    paid = "Paid"
    subscription = "Subscription"


class Resource(Base):
    __tablename__ = "resources"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    title: Mapped[str] = mapped_column(String(512), nullable=False)
    url: Mapped[str] = mapped_column(String(2048), nullable=False, unique=True)
    description: Mapped[str | None] = mapped_column(Text)

    # ── Source metadata ───────────────────────────────────────────────────────
    provider: Mapped[str] = mapped_column(String(128), nullable=False)  # e.g. "Udemy"
    resource_type: Mapped[ResourceType] = mapped_column(
        Enum(ResourceType), nullable=False
    )
    difficulty: Mapped[DifficultyLevel | None] = mapped_column(Enum(DifficultyLevel))
    cost: Mapped[CostType] = mapped_column(Enum(CostType), default=CostType.free)

    # ── Quality metrics ───────────────────────────────────────────────────────
    duration_minutes: Mapped[int | None] = mapped_column(Integer)
    platform_rating: Mapped[float | None] = mapped_column(Float)       # native platform rating (0–5)
    enrollment_count: Mapped[int | None] = mapped_column(Integer)      # e.g. Udemy enrolments
    completion_rate: Mapped[float | None] = mapped_column(Float)       # 0.0 – 1.0

    # ── Credibility score (composite, computed by credibility_service) ────────
    credibility_score: Mapped[float | None] = mapped_column(Float)     # 0.0 – 1.0
    credibility_updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # ── Flags ─────────────────────────────────────────────────────────────────
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_manually_curated: Mapped[bool] = mapped_column(Boolean, default=False)

    # ── Timestamps ────────────────────────────────────────────────────────────
    scraped_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # ── Relationships ─────────────────────────────────────────────────────────
    skill_links: Mapped[list["ResourceSkillLink"]] = relationship(
        back_populates="resource", cascade="all, delete-orphan"
    )
    social_signals: Mapped[list["SocialSignal"]] = relationship(
        back_populates="resource", cascade="all, delete-orphan"
    )


class ResourceSkillLink(Base):
    """Many-to-many: a resource can teach multiple skills; a skill can be covered by many resources."""

    __tablename__ = "resource_skill_links"
    __table_args__ = (UniqueConstraint("resource_id", "skill_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    resource_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("resources.id", ondelete="CASCADE")
    )
    skill_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("skills.id", ondelete="CASCADE")
    )
    relevance_score: Mapped[float] = mapped_column(Float, default=1.0)  # 0–1, how central the skill is

    resource: Mapped["Resource"] = relationship(back_populates="skill_links")
    skill: Mapped["Skill"] = relationship(back_populates="resource_links")
