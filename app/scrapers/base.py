"""
Base Playwright scraper.

All platform-specific scrapers inherit from PlaywrightScraper and implement
`scrape()`. The base class manages browser lifecycle, retries, and rate-limiting.
"""

import asyncio
import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime, timezone

from playwright.async_api import (
    Browser,
    BrowserContext,
    Page,
    Playwright,
    async_playwright,
)
from playwright_stealth import Stealth
from tenacity import (
    AsyncRetrying,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


@dataclass
class ScrapedResource:
    """Intermediate representation returned by all scrapers before DB insertion."""

    title: str
    url: str
    provider: str
    resource_type: str                          # matches ResourceType enum value
    description: str | None = None
    difficulty: str | None = None               # matches DifficultyLevel enum value
    cost: str = "Free"                          # matches CostType enum value
    duration_minutes: int | None = None
    platform_rating: float | None = None
    enrollment_count: int | None = None
    thumbnail_url: str | None = None            # image/thumbnail URL for visual display
    skill_tags: list[str] = field(default_factory=list)  # raw skill names for lookup
    scraped_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


class PlaywrightScraper(ABC):
    """
    Abstract base for all Playwright-based scrapers.

    Usage:
        async with UdemyScraper() as scraper:
            results = await scraper.scrape(query="docker kubernetes")
    """

    # Subclasses can override these
    PROVIDER: str = "Unknown"
    MAX_RETRIES: int = 3
    DELAY_BETWEEN_PAGES: float = 2.0  # polite delay in seconds

    def __init__(self) -> None:
        self._playwright: Playwright | None = None
        self._browser: Browser | None = None
        self._context: BrowserContext | None = None
        self._stealth = Stealth()  # Stealth configuration

    # ── Lifecycle ─────────────────────────────────────────────────────────────

    async def __aenter__(self) -> "PlaywrightScraper":
        self._playwright = await async_playwright().start()
        self._browser = await self._playwright.chromium.launch(
            headless=settings.scraper_headless,
            args=[
                "--no-sandbox",
                "--disable-blink-features=AutomationControlled",
                "--disable-dev-shm-usage",
                "--disable-web-security",
                "--disable-features=IsolateOrigins,site-per-process",
            ],
        )
        self._context = await self._browser.new_context(
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/121.0.0.0 Safari/537.36"
            ),
            viewport={"width": 1920, "height": 1080},
            locale="en-US",
            timezone_id="America/New_York",
            permissions=["geolocation"],
            geolocation={"latitude": 40.7128, "longitude": -74.0060},
            extra_http_headers={
                "Accept-Language": "en-US,en;q=0.9",
                "Accept-Encoding": "gzip, deflate, br",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                "Connection": "keep-alive",
                "Upgrade-Insecure-Requests": "1",
            },
        )
        
        # Add init script to remove webdriver traces
        await self._context.add_init_script("""
            Object.defineProperty(navigator, 'webdriver', {get: () => undefined});
            Object.defineProperty(navigator, 'plugins', {get: () => [1, 2, 3, 4, 5]});
            Object.defineProperty(navigator, 'languages', {get: () => ['en-US', 'en']});
            window.chrome = { runtime: {} };
        """)
        
        # Block images/fonts to speed up scraping
        await self._context.route(
            "**/*.{png,jpg,jpeg,gif,webp,svg,woff,woff2,ttf,otf}",
            lambda route: route.abort(),
        )
        return self

    async def __aexit__(self, *_) -> None:
        if self._context:
            await self._context.close()
        if self._browser:
            await self._browser.close()
        if self._playwright:
            await self._playwright.stop()

    # ── Helpers ───────────────────────────────────────────────────────────────

    async def _new_page(self) -> Page:
        if self._context is None:
            raise RuntimeError("Scraper context not initialized. Use async with.")
        page = await self._context.new_page()
        # Apply stealth techniques to avoid bot detection
        await self._stealth.apply_stealth_async(page)
        return page

    async def _goto_with_retry(self, page: Page, url: str) -> None:
        """Navigate to a URL with exponential backoff retries."""
        async for attempt in AsyncRetrying(
            stop=stop_after_attempt(self.MAX_RETRIES),
            wait=wait_exponential(multiplier=1, min=2, max=10),
            retry=retry_if_exception_type(Exception),
            reraise=True,
        ):
            with attempt:
                await page.goto(
                    url,
                    timeout=settings.scraper_timeout_ms,
                    wait_until="domcontentloaded",
                )

    async def _polite_delay(self) -> None:
        """Avoid hammering target sites."""
        await asyncio.sleep(self.DELAY_BETWEEN_PAGES)

    # ── Interface ─────────────────────────────────────────────────────────────

    @abstractmethod
    async def scrape(self, query: str, max_results: int = 10) -> list[ScrapedResource]:
        """
        Scrape resources for the given skill/topic query.

        Args:
            query:       Skill or topic string (e.g. "Docker basics")
            max_results: Upper bound on results to return per call.

        Returns:
            List of ScrapedResource dataclasses ready for DB insertion.
        """
        ...
