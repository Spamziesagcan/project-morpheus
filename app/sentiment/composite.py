"""
Composite sentiment pipeline.

Decision logic:
  1. Run VADER (fast, free, local) on all signals.
  2. For signals where |compound| < THRESHOLD (VADER is uncertain), escalate to Gemini.
  3. Merge results using a confidence-weighted vote.
  4. Compute engagement-weighted score per signal (upvotes act as a quality amplifier).
"""

import asyncio
import logging
from dataclasses import dataclass
from datetime import datetime, timezone

from app.sentiment import gemini_analyzer, vader_analyzer

logger = logging.getLogger(__name__)

# Escalate to Gemini when VADER's compound absolute value is below this
ESCALATION_THRESHOLD = 0.4

# Time-decay half-life in days — signals older than this are halved in weight
DECAY_HALF_LIFE_DAYS = 180


@dataclass
class SentimentResult:
    """Fully resolved sentiment for one social signal."""
    text: str
    vader_compound: float
    final_sentiment: str          # "positive" | "neutral" | "negative"
    gemini_sentiment: str | None  # None if Gemini was not called
    gemini_confidence: float | None
    weighted_score: float         # 0.0 (very negative) – 1.0 (very positive)


def _time_decay_factor(posted_at: datetime | None, half_life_days: int = DECAY_HALF_LIFE_DAYS) -> float:
    """
    Returns a multiplier in (0, 1].
    A signal posted today → 1.0
    A signal posted `half_life_days` ago → 0.5
    """
    if not posted_at:
        return 0.7  # unknown age → moderate penalty
    delta_days = (datetime.now(timezone.utc) - posted_at).days
    if delta_days <= 0:
        return 1.0
    import math
    return math.pow(0.5, delta_days / half_life_days)


def _sentiment_to_score(label: str) -> float:
    """Map sentiment label to a 0–1 numeric score."""
    return {"positive": 1.0, "neutral": 0.5, "negative": 0.0}.get(label, 0.5)


def _upvote_weight(upvotes: int) -> float:
    """
    Log-scaled upvote multiplier (0.5–2.0).
    Posts with 0 upvotes → 0.5x  (low confidence signal)
    Posts with 100+ upvotes → approaches 2.0x (community-validated)
    """
    import math
    if upvotes <= 0:
        return 0.5
    return min(2.0, 0.5 + math.log1p(upvotes) / 5.0)


async def analyse_signal(
    text: str,
    upvotes: int = 0,
    posted_at: datetime | None = None,
) -> SentimentResult:
    """
    Full pipeline for a single social signal.
    VADER → (optionally) Gemini → weighted score.
    """
    vader = vader_analyzer.analyse(text)
    vader_compound: float = vader["compound"]

    gemini_result: dict | None = None
    final_label: str = vader["label"]

    # Escalate to Gemini if VADER is uncertain
    if abs(vader_compound) < ESCALATION_THRESHOLD:
        gemini_result = await gemini_analyzer.analyse(text)
        # If Gemini is confident, trust it; otherwise blend
        g_conf = gemini_result.get("confidence", 0.5)
        if g_conf >= 0.7:
            final_label = gemini_result["sentiment"]
        else:
            # Blend: slight lean toward VADER when Gemini is unsure
            vader_score = _sentiment_to_score(vader["label"])
            gemini_score = _sentiment_to_score(gemini_result["sentiment"])
            blended = 0.4 * vader_score + 0.6 * gemini_score
            if blended >= 0.6:
                final_label = "positive"
            elif blended <= 0.4:
                final_label = "negative"
            else:
                final_label = "neutral"

    # Engagement × time-decay weighted score
    raw_score = _sentiment_to_score(final_label)
    decay = _time_decay_factor(posted_at)
    u_weight = _upvote_weight(upvotes)
    weighted_score = round(min(1.0, max(0.0, raw_score * decay * u_weight / 2.0 + 0.5 * (1 - decay))), 4)
    # Normalise back to [0,1] — the formula above can exceed 1 for very high upvotes
    weighted_score = min(1.0, max(0.0, weighted_score))

    return SentimentResult(
        text=text,
        vader_compound=vader_compound,
        final_sentiment=final_label,
        gemini_sentiment=gemini_result["sentiment"] if gemini_result else None,
        gemini_confidence=gemini_result.get("confidence") if gemini_result else None,
        weighted_score=weighted_score,
    )


async def analyse_signals_batch(
    signals: list[dict],  # each: {"text": str, "upvotes": int, "posted_at": datetime|None}
    concurrency: int = 5,
) -> list[SentimentResult]:
    """
    Analyse a batch of social signals concurrently.

    Args:
        signals:     List of dicts with keys: text, upvotes, posted_at
        concurrency: Max simultaneous Gemini calls
    """
    sem = asyncio.Semaphore(concurrency)

    async def bounded(sig: dict) -> SentimentResult:
        async with sem:
            return await analyse_signal(
                text=sig.get("text", ""),
                upvotes=sig.get("upvotes", 0),
                posted_at=sig.get("posted_at"),
            )

    return await asyncio.gather(*[bounded(s) for s in signals])
