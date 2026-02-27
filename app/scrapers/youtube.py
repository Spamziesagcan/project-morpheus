"""
YouTube scraper — uses the official YouTube Data API v3.
No Playwright needed; falls back gracefully if no API key is configured.
"""

import logging

import httpx

from app.config import get_settings
from app.scrapers.base import ScrapedResource

logger = logging.getLogger(__name__)
settings = get_settings()

_SEARCH_URL = "https://www.googleapis.com/youtube/v3/search"
_VIDEO_URL = "https://www.googleapis.com/youtube/v3/videos"
_CHANNEL_WATCH = "https://www.youtube.com/watch?v={video_id}"


def _duration_iso_to_minutes(duration: str) -> int | None:
    """Convert ISO 8601 duration (PT1H23M45S) → minutes."""
    import re
    match = re.match(
        r"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?", duration or ""
    )
    if not match:
        return None
    hours = int(match.group(1) or 0)
    minutes = int(match.group(2) or 0)
    return hours * 60 + minutes


def _infer_difficulty(title: str, description: str) -> str | None:
    combined = (title + " " + description).lower()
    if any(w in combined for w in ("beginner", "introduction", "getting started", "basics")):
        return "Beginner"
    if any(w in combined for w in ("intermediate", "practical")):
        return "Intermediate"
    if any(w in combined for w in ("advanced", "expert", "deep dive", "mastery")):
        return "Advanced"
    return None


class YouTubeScraper:
    """
    Fetches YouTube tutorial/lecture videos via YouTube Data API v3.
    Not a PlaywrightScraper because a proper API is available.
    """

    PROVIDER = "YouTube"

    async def scrape(self, query: str, max_results: int = 10) -> list[ScrapedResource]:
        if not settings.youtube_api_key:
            logger.warning("YouTube API key not set — skipping YouTube scrape.")
            return []

        results: list[ScrapedResource] = []

        async with httpx.AsyncClient(timeout=20) as client:
            # Step 1: search for videos
            search_resp = await client.get(
                _SEARCH_URL,
                params={
                    "part": "id,snippet",
                    "q": f"{query} tutorial",
                    "type": "video",
                    "maxResults": max_results,
                    "relevanceLanguage": "en",
                    "key": settings.youtube_api_key,
                },
            )
            search_resp.raise_for_status()
            items = search_resp.json().get("items", [])

            if not items:
                return []

            video_ids = [item["id"]["videoId"] for item in items if "videoId" in item.get("id", {})]

            # Step 2: fetch content details (duration, view count)
            details_resp = await client.get(
                _VIDEO_URL,
                params={
                    "part": "contentDetails,statistics,snippet",
                    "id": ",".join(video_ids),
                    "key": settings.youtube_api_key,
                },
            )
            details_resp.raise_for_status()
            details_by_id: dict = {
                v["id"]: v for v in details_resp.json().get("items", [])
            }

            for item in items:
                vid_id = item.get("id", {}).get("videoId")
                if not vid_id:
                    continue

                snippet = item.get("snippet", {})
                title = snippet.get("title", "").strip()
                description = snippet.get("description", "").strip()
                detail = details_by_id.get(vid_id, {})
                duration_iso = detail.get("contentDetails", {}).get("duration")
                view_count = int(
                    detail.get("statistics", {}).get("viewCount", 0) or 0
                )
                
                # Extract thumbnail - prefer high quality, fallback to medium/default
                thumbnails = snippet.get("thumbnails", {})
                thumbnail_url = (
                    thumbnails.get("high", {}).get("url")
                    or thumbnails.get("medium", {}).get("url")
                    or thumbnails.get("default", {}).get("url")
                )

                results.append(
                    ScrapedResource(
                        title=title,
                        url=_CHANNEL_WATCH.format(video_id=vid_id),
                        provider=self.PROVIDER,
                        resource_type="video",
                        description=description[:500] if description else None,
                        difficulty=_infer_difficulty(title, description),
                        cost="Free",
                        duration_minutes=_duration_iso_to_minutes(duration_iso),
                        enrollment_count=view_count,
                        thumbnail_url=thumbnail_url,
                        skill_tags=[query],
                    )
                )

        logger.info("YouTube scrape complete: %d results for '%s'", len(results), query)
        return results
