"""
Credibility scoring service.

Computes a composite 0–1 credibility score for each resource using four
independently weighted signals:

  1. Resource Metadata Score   (35%) — native quality indicators
  2. Community Sentiment Score (30%) — Reddit + X sentiment, engagement-weighted
  3. Platform Engagement Score (20%) — enrollments, completion rate, views
  4. Time Decay Correction     (15%) — penalises stale/old resources

Final score is stored on the Resource row and refreshed periodically.
"""

import logging
import math
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import get_settings
from app.models.resource import Resource
from app.models.social_signal import SocialSignal
from app.sentiment.composite import analyse_signals_batch, SentimentResult

logger = logging.getLogger(__name__)
settings = get_settings()


# ── Sub-score calculators ──────────────────────────────────────────────────────


def _metadata_score(resource: Resource) -> float:
    """
    0–1 score from resource metadata fields.
    Considers: platform_rating, manual curation flag, resource type bonus.
    """
    score = 0.0
    weight_sum = 0.0

    if resource.platform_rating is not None:
        # Normalise 0–5 → 0–1
        score += (resource.platform_rating / 5.0) * 0.6
        weight_sum += 0.6

    if resource.is_manually_curated:
        score += 0.3
        weight_sum += 0.3

    # Documentation and official guides get a small bonus for authoritative source
    if resource.resource_type and resource.resource_type.value == "documentation":
        score += 0.1
        weight_sum += 0.1

    if weight_sum == 0:
        return 0.5  # no metadata → neutral baseline

    return min(1.0, score / weight_sum * (weight_sum / max(weight_sum, 1.0)))


def _engagement_score(resource: Resource) -> float:
    """
    0–1 score from enrollment/view count and completion rate.
    Uses log scaling to prevent mega-popular courses from dominating.
    """
    enrollment_score = 0.0
    if resource.enrollment_count and resource.enrollment_count > 0:
        # log scale: 10k → ~0.5, 100k → ~0.65, 1M → ~0.8
        enrollment_score = min(1.0, math.log10(resource.enrollment_count) / 7.0)

    completion_score = resource.completion_rate if resource.completion_rate is not None else 0.5

    # Blend 60% enrolments / 40% completion
    return round(0.6 * enrollment_score + 0.4 * completion_score, 4)


def _time_freshness_score(resource: Resource) -> float:
    """
    0–1 score based on how recently the resource was scraped/updated.
    Resources not updated in >2 years are penalised.
    """
    reference = resource.scraped_at or resource.updated_at
    if not reference:
        return 0.5

    if reference.tzinfo is None:
        reference = reference.replace(tzinfo=timezone.utc)

    days_old = (datetime.now(timezone.utc) - reference).days
    # half-life ≈ 365 days
    return round(math.pow(0.5, days_old / 365), 4)


def _community_sentiment_score(signals: list[SocialSignal]) -> float:
    """
    Aggregate weighted_sentiment_score from social signals.
    Uses upvotes as an amplifier (already incorporated in weighted_sentiment_score).
    """
    if not signals:
        return 0.5  # no community data → neutral

    total_weight = 0.0
    weighted_sum = 0.0

    for s in signals:
        if s.weighted_sentiment_score is None:
            continue
        # Use upvotes+1 as weight to avoid zero-weight signals
        w = math.log1p(s.upvotes + 1)
        weighted_sum += s.weighted_sentiment_score * w
        total_weight += w

    if total_weight == 0:
        return 0.5

    return round(weighted_sum / total_weight, 4)


# ── Main service ──────────────────────────────────────────────────────────────


async def compute_and_store_credibility(
    db: AsyncSession, resource_id: str
) -> float | None:
    """
    Full credibility pipeline for one resource:
      1. Fetch resource + social signals from DB
      2. Run sentiment analysis on any unscored signals
      3. Compute all sub-scores
      4. Compute weighted composite
      5. Persist score to Resource row

    Returns the final credibility score (0–1), or None on failure.
    """
    result = await db.execute(
        select(Resource)
        .where(Resource.id == resource_id)
        .options(selectinload(Resource.social_signals))
    )
    resource: Resource | None = result.scalar_one_or_none()

    if resource is None:
        logger.warning("credibility: resource %s not found", resource_id)
        return None

    signals = resource.social_signals

    # Score any signals that haven't been sentiment-analysed yet
    unscored = [s for s in signals if s.weighted_sentiment_score is None]
    if unscored:
        payload = [
            {
                "text": s.content_snippet or "",
                "upvotes": s.upvotes or 0,
                "posted_at": s.posted_at,
            }
            for s in unscored
        ]
        results: list[SentimentResult] = await analyse_signals_batch(payload)
        for signal, res in zip(unscored, results):
            signal.vader_compound = res.vader_compound
            signal.gemini_sentiment = res.gemini_sentiment
            signal.gemini_confidence = res.gemini_confidence
            signal.final_sentiment = res.final_sentiment
            signal.weighted_sentiment_score = res.weighted_score

        await db.flush()

    # ── Compute sub-scores ────────────────────────────────────────────────────
    w = settings  # alias for weights
    s_meta = _metadata_score(resource)
    s_community = _community_sentiment_score(signals)
    s_engagement = _engagement_score(resource)
    s_freshness = _time_freshness_score(resource)

    composite = (
        s_meta * w.weight_resource_metadata
        + s_community * w.weight_community_sentiment
        + s_engagement * w.weight_platform_engagement
        + s_freshness * w.weight_time_decay
    )
    composite = round(min(1.0, max(0.0, composite)), 4)

    logger.info(
        "Credibility for %s: meta=%.2f comm=%.2f engage=%.2f fresh=%.2f → %.4f",
        resource_id,
        s_meta,
        s_community,
        s_engagement,
        s_freshness,
        composite,
    )

    resource.credibility_score = composite
    resource.credibility_updated_at = datetime.now(timezone.utc)
    await db.flush()

    return composite


async def bulk_recompute(db: AsyncSession) -> int:
    """Recompute credibility scores for all active resources. Returns count updated."""
    result = await db.execute(select(Resource.id).where(Resource.is_active == True))
    resource_ids = [row[0] for row in result.fetchall()]

    updated = 0
    for rid in resource_ids:
        try:
            score = await compute_and_store_credibility(db, rid)
            if score is not None:
                updated += 1
        except Exception as e:
            logger.error("Failed to score resource %s: %s", rid, e)

    await db.commit()
    logger.info("Bulk credibility recompute done: %d resources updated", updated)
    return updated
