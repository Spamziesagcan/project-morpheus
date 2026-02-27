import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Enum, Float, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class SignalSource(str, enum.Enum):
    reddit = "reddit"
    twitter_x = "twitter_x"


class SentimentLabel(str, enum.Enum):
    positive = "positive"
    neutral = "neutral"
    negative = "negative"


class SocialSignal(Base):
    """
    Represents a single social post/comment that mentions or reviews a resource.
    Populated by the Reddit and X scrapers, then scored by the sentiment layer.
    """

    __tablename__ = "social_signals"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    resource_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("resources.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # ── Source info ───────────────────────────────────────────────────────────
    source: Mapped[SignalSource] = mapped_column(Enum(SignalSource), nullable=False)
    source_post_id: Mapped[str | None] = mapped_column(String(256))
    source_url: Mapped[str | None] = mapped_column(String(2048))
    author: Mapped[str | None] = mapped_column(String(256))

    # ── Content ───────────────────────────────────────────────────────────────
    content_snippet: Mapped[str | None] = mapped_column(Text)   # trimmed text mentioning the resource
    subreddit: Mapped[str | None] = mapped_column(String(128))  # Reddit only

    # ── Engagement metrics ────────────────────────────────────────────────────
    upvotes: Mapped[int] = mapped_column(Integer, default=0)
    downvotes: Mapped[int] = mapped_column(Integer, default=0)
    comment_count: Mapped[int] = mapped_column(Integer, default=0)

    # Time of the original post — used for decay weighting
    posted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # ── Sentiment (filled in by sentiment layer) ──────────────────────────────
    vader_compound: Mapped[float | None] = mapped_column(Float)  # –1.0 to +1.0
    gemini_sentiment: Mapped[SentimentLabel | None] = mapped_column(Enum(SentimentLabel))
    gemini_confidence: Mapped[float | None] = mapped_column(Float)  # 0.0 – 1.0
    final_sentiment: Mapped[SentimentLabel | None] = mapped_column(Enum(SentimentLabel))

    # Engagement-weighted sentiment score baked into credibility calculation
    weighted_sentiment_score: Mapped[float | None] = mapped_column(Float)  # 0.0 – 1.0

    # ── Timestamps ────────────────────────────────────────────────────────────
    scraped_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    # ── Relationships ─────────────────────────────────────────────────────────
    resource: Mapped["Resource"] = relationship(back_populates="social_signals")  # noqa: F821
