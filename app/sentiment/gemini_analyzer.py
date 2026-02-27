"""
Gemini-based sentiment analyzer.

Called only when VADER confidence is low (compound score between -0.4 and +0.4).
This avoids unnecessary API calls for clearly positive/negative text while
getting LLM-quality understanding for ambiguous cases like sarcasm, irony,
or nuanced criticism.
"""

import asyncio
import json
import logging

import google.generativeai as genai

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# VADER compound threshold below which we escalate to Gemini
VADER_UNCERTAINTY_THRESHOLD = 0.4

_SYSTEM_PROMPT = """You are a sentiment classifier for educational resource reviews.
Analyze the following social media post or comment about a learning resource (course, article, tutorial, book, etc.).

Return ONLY valid JSON with this exact structure:
{
  "sentiment": "positive" | "neutral" | "negative",
  "confidence": 0.0-1.0,
  "reason": "one sentence explanation"
}

Guidelines:
- "positive": The author recommends it, found it helpful, got results from it, or expresses satisfaction.
- "negative": The author warns against it, found it wasteful, outdated, or misleading.
- "neutral": Purely informational, no clear opinion, or mixed without strong lean.
- Consider sarcasm carefully — "Oh yeah, GREAT course" in a rant is negative.
- Upvote counts are engagement signals, not sentiment — ignore them in analysis.
- Focus on educational value signals, not general mood of the post."""


async def analyse(text: str) -> dict:
    """
    Classify sentiment of a text snippet using Gemini.

    Returns:
        {
            "sentiment": "positive" | "neutral" | "negative",
            "confidence": float,
            "reason": str
        }
    Falls back to neutral with 0.5 confidence on any API error.
    """
    if not settings.gemini_api_key:
        logger.debug("Gemini API key not set — returning neutral fallback")
        return {"sentiment": "neutral", "confidence": 0.5, "reason": "API key not configured"}

    if not text or not text.strip():
        return {"sentiment": "neutral", "confidence": 1.0, "reason": "Empty text"}

    try:
        genai.configure(api_key=settings.gemini_api_key)
        model = genai.GenerativeModel(
            model_name=settings.gemini_model,
            system_instruction=_SYSTEM_PROMPT,
            generation_config=genai.GenerationConfig(
                temperature=0.1,
                max_output_tokens=150,
            ),
        )

        # Gemini SDK is sync; run in executor to avoid blocking the event loop
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            None,
            lambda: model.generate_content(text[:1000]),  # cap at 1000 chars
        )

        raw = response.text.strip()
        # Strip potential markdown code fences
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        raw = raw.strip()

        parsed = json.loads(raw)
        return {
            "sentiment": parsed.get("sentiment", "neutral"),
            "confidence": float(parsed.get("confidence", 0.5)),
            "reason": parsed.get("reason", ""),
        }

    except json.JSONDecodeError as e:
        logger.warning("Gemini returned non-JSON response: %s", e)
        return {"sentiment": "neutral", "confidence": 0.4, "reason": "Parse error"}
    except Exception as e:
        logger.error("Gemini API error: %s", e)
        return {"sentiment": "neutral", "confidence": 0.5, "reason": f"API error: {e}"}


async def batch_analyse(texts: list[str], concurrency: int = 5) -> list[dict]:
    """
    Analyse multiple texts concurrently, respecting Gemini rate limits.

    Args:
        texts:       List of text snippets to analyse
        concurrency: Max simultaneous Gemini calls (default 5)
    """
    sem = asyncio.Semaphore(concurrency)

    async def bounded(text: str) -> dict:
        async with sem:
            result = await analyse(text)
            # Small delay to respect RPM quota
            await asyncio.sleep(0.2)
            return result

    return await asyncio.gather(*[bounded(t) for t in texts])
