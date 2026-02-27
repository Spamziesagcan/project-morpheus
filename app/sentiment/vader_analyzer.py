"""
VADER-based sentiment analyzer.

VADER (Valence Aware Dictionary and sEntiment Reasoner) is a rule-based model
tuned for social media text. It runs locally with zero API cost — ideal as the
fast, always-on first pass before calling Gemini.
"""

import logging

from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

logger = logging.getLogger(__name__)

# Singleton — VADER loads its lexicon once
_analyzer = SentimentIntensityAnalyzer()

# Keyword boosters specific to learning/resource quality signals
# These nudge VADER scores for domain vocabulary it may misread
_POSITIVE_KEYWORDS = {
    "recommend", "recommended", "excellent", "solid", "worth it", "worth every",
    "loved", "great course", "best course", "must take", "helped me", "landed",
    "got my job", "got a job", "passed", "cleared", "amazing", "thorough",
    "well structured", "clear explanation", "easy to follow",
}
_NEGATIVE_KEYWORDS = {
    "waste of time", "waste of money", "outdated", "out of date", "avoid",
    "scam", "misleading", "bad course", "boring", "terrible", "useless",
    "wouldn't recommend", "do not recommend", "skip", "overpriced",
}


def _apply_keyword_boost(text: str, score: float) -> float:
    """
    Nudge the raw VADER score ±0.1 for domain-specific vocabulary VADER
    doesn't handle well. Clamped to [-1, 1].
    """
    text_lower = text.lower()
    for phrase in _POSITIVE_KEYWORDS:
        if phrase in text_lower:
            score = min(1.0, score + 0.07)
    for phrase in _NEGATIVE_KEYWORDS:
        if phrase in text_lower:
            score = max(-1.0, score - 0.07)
    return score


def analyse(text: str) -> dict:
    """
    Run VADER on a text snippet and return enriched scores.

    Returns:
        {
            "compound": float (-1 to 1),
            "label":    "positive" | "neutral" | "negative",
            "pos": float, "neu": float, "neg": float  # raw VADER outputs
        }
    """
    if not text or not text.strip():
        return {"compound": 0.0, "label": "neutral", "pos": 0.0, "neu": 1.0, "neg": 0.0}

    scores = _analyzer.polarity_scores(text)
    compound = _apply_keyword_boost(text, scores["compound"])

    if compound >= 0.05:
        label = "positive"
    elif compound <= -0.05:
        label = "negative"
    else:
        label = "neutral"

    return {
        "compound": round(compound, 4),
        "label": label,
        "pos": scores["pos"],
        "neu": scores["neu"],
        "neg": scores["neg"],
    }


def batch_analyse(texts: list[str]) -> list[dict]:
    """Analyse multiple texts, returns list in same order."""
    return [analyse(t) for t in texts]
