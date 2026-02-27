import enum
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class SkillCategory(str, enum.Enum):
    programming_language = "Programming Language"
    framework = "Framework"
    database = "Database"
    devops = "DevOps"
    cloud = "Cloud"
    data_science = "Data Science"
    security = "Security"
    soft_skill = "Soft Skill"
    tool = "Tool"
    concept = "Concept"
    other = "Other"


class Skill(Base):
    __tablename__ = "skills"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(256), nullable=False, unique=True)
    canonical_name: Mapped[str] = mapped_column(String(256), nullable=False)  # normalized
    category: Mapped[SkillCategory] = mapped_column(
        Enum(SkillCategory), default=SkillCategory.other
    )
    description: Mapped[str | None] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # Self-referential prerequisite relationship
    prerequisite_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("skills.id", ondelete="SET NULL"), nullable=True
    )

    # ── Timestamps ────────────────────────────────────────────────────────────
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    # ── Relationships ─────────────────────────────────────────────────────────
    resource_links: Mapped[list["ResourceSkillLink"]] = relationship(  # noqa: F821
        back_populates="skill"
    )
    prerequisite: Mapped["Skill | None"] = relationship(
        "Skill", remote_side="Skill.id", foreign_keys=[prerequisite_id]
    )
