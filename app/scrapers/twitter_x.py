"""
X (Twitter) social signal scraper — Playwright based.

X deprecated its free API tier in 2023. We use Playwright to scrape search
results. Rate-limiting and auth are handled carefully.

Strategy:
  1. Attempt to scrape via public X search (works when not aggressively rate-limited).
  2. Uses saved session cookies (TWITTER_COOKIES env) when provided for reliability.
"""

import json
import logging
import os
from dataclasses import dataclass
from datetime import datetime, timezone

from playwright.async_api import Page

from app.scrapers.base import PlaywrightScraper

logger = logging.getLogger(__name__)

_SEARCH_URL = "https://x.com/search?q={query}&f=live&src=typed_query"


@dataclass
class TwitterSignal:
    source: str = "twitter_x"
    source_post_id: str = ""
    source_url: str = ""
    author: str = ""
    content_snippet: str = ""
    upvotes: int = 0     # likes on X
    comment_count: int = 0
    posted_at: datetime | None = None


def _parse_count(text: str | None) -> int:
    """Convert '1.2K', '15K', '1M' etc. to int."""
    if not text:
        return 0
    text = text.strip().upper().replace(",", "")
    try:
        if "K" in text:
            return int(float(text.replace("K", "")) * 1_000)
        if "M" in text:
            return int(float(text.replace("M", "")) * 1_000_000)
        return int(text)
    except ValueError:
        return 0


class TwitterXScraper(PlaywrightScraper):
    """
    Scrapes X (Twitter) search results for mentions of a resource.
    Returns TwitterSignal objects for the sentiment validation layer.
    """

    PROVIDER = "X (Twitter)"
    DELAY_BETWEEN_PAGES = 3.0

    async def _load_cookies(self, page: Page) -> None:
        """Load saved session cookies from TWITTER_COOKIES env variable (JSON array)."""
        raw = os.environ.get("TWITTER_COOKIES", "")
        if not raw:
            return
        try:
            cookies = json.loads(raw)
            await self._context.add_cookies(cookies)
            logger.info("X: loaded %d session cookies", len(cookies))
        except Exception as e:
            logger.warning("X: failed to load cookies — %s", e)

    async def _extract_tweets(self, page: Page, max_results: int) -> list[TwitterSignal]:
        signals: list[TwitterSignal] = []
        seen_ids: set[str] = set()

        # Wait for timeline to load
        try:
            await page.wait_for_selector(
                "[data-testid='tweet'], article[role='article']",
                timeout=15_000,
            )
        except Exception:
            logger.warning("X: tweet selector timed out — page may require login")
            return signals

        tweet_els = await page.query_selector_all(
            "[data-testid='tweet'], article[role='article']"
        )

        for tweet_el in tweet_els[:max_results]:
            try:
                # Text content
                text_el = await tweet_el.query_selector("[data-testid='tweetText']")
                text = (await text_el.inner_text()).strip() if text_el else ""

                # Author
                author_el = await tweet_el.query_selector("[data-testid='User-Name'] span")
                author = (await author_el.inner_text()).strip() if author_el else ""

                # Permalink
                time_el = await tweet_el.query_selector("time")
                link_el = await tweet_el.query_selector("a[href*='/status/']")
                href = await link_el.get_attribute("href") if link_el else ""
                tweet_url = f"https://x.com{href}" if href and href.startswith("/") else href
                tweet_id = href.split("/status/")[-1].split("/")[0] if "/status/" in href else ""

                if tweet_id in seen_ids:
                    continue
                seen_ids.add(tweet_id)

                # Timestamp
                dt_attr = await time_el.get_attribute("datetime") if time_el else None
                posted_at = datetime.fromisoformat(dt_attr.replace("Z", "+00:00")) if dt_attr else None

                # Engagement
                like_el = await tweet_el.query_selector(
                    "[data-testid='like'] [data-testid='app-text-transition-container']"
                )
                likes_text = await like_el.inner_text() if like_el else "0"

                reply_el = await tweet_el.query_selector(
                    "[data-testid='reply'] [data-testid='app-text-transition-container']"
                )
                reply_text = await reply_el.inner_text() if reply_el else "0"

                signals.append(
                    TwitterSignal(
                        source_post_id=tweet_id,
                        source_url=tweet_url,
                        author=author,
                        content_snippet=text[:500],
                        upvotes=_parse_count(likes_text),
                        comment_count=_parse_count(reply_text),
                        posted_at=posted_at,
                    )
                )
            except Exception as e:
                logger.warning("X: failed to parse tweet — %s", e)
                continue

        return signals

    async def collect_signals(
        self, resource_title: str, max_results: int = 10
    ) -> list[TwitterSignal]:
        """
        Search X for posts mentioning the resource title.

        Args:
            resource_title: Resource name used as the search query
            max_results:    Max tweets to collect

        Returns:
            List of TwitterSignal objects
        """
        query_encoded = resource_title.replace(" ", "%20")
        url = _SEARCH_URL.format(query=f'"{query_encoded}"')
        signals: list[TwitterSignal] = []

        async with self:
            page: Page = await self._new_page()
            try:
                await self._load_cookies(page)
                logger.info("X scrape: %s", url)
                await self._goto_with_retry(page, url)
                await self._polite_delay()
                signals = await self._extract_tweets(page, max_results)
            except Exception as e:
                logger.error("X scrape failed: %s", e)
            finally:
                await page.close()

        logger.info("X collected %d signals for '%s'", len(signals), resource_title)
        return signals

    # PlaywrightScraper requires scrape() — not the primary use case for X
    async def scrape(self, query: str, max_results: int = 10) -> list:
        return []
