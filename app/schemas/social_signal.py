import uuid
from datetime import datetime

from pydantic import BaseModel, Field

from app.models.social_signal import SentimentLabel, SignalSource


class SocialSignalCreate(BaseModel):
    resource_id: uuid.UUID
    source: SignalSource
    source_post_id: str | None = None
    source_url: str | None = None
    author: str | None = None
    content_snippet: str | None = None
    subreddit: str | None = None
    upvotes: int = 0
    downvotes: int = 0
    comment_count: int = 0
    posted_at: datetime | None = None


class SocialSignalRead(SocialSignalCreate):
    id: uuid.UUID
    vader_compound: float | None
    gemini_sentiment: SentimentLabel | None
    gemini_confidence: float | None
    final_sentiment: SentimentLabel | None
    weighted_sentiment_score: float | None
    scraped_at: datetime

    model_config = {"from_attributes": True}
