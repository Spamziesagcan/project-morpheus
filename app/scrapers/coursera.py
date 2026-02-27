"""
Coursera scraper (Playwright).

Coursera deprecated its Partner API for public use.
We scrape the search results page for courses and specializations.
"""

import logging
import re

from playwright.async_api import Page

from app.scrapers.base import PlaywrightScraper, ScrapedResource

logger = logging.getLogger(__name__)

_SEARCH_URL = "https://www.coursera.org/search?query={query}&language=English"


def _infer_difficulty(level_text: str | None) -> str | None:
    if not level_text:
        return None
    level_lower = level_text.lower()
    if "beginner" in level_lower:
        return "Beginner"
    if "intermediate" in level_lower:
        return "Intermediate"
    if "advanced" in level_lower or "mixed" in level_lower:
        return "Advanced"
    return None


def _parse_rating(text: str | None) -> float | None:
    if not text:
        return None
    match = re.search(r"(\d+\.\d+|\d+)", text)
    return float(match.group(1)) if match else None


def _parse_enrollments(text: str | None) -> int | None:
    if not text:
        return None
    text = text.replace(",", "").replace(" ", "")
    # Handle 1M, 2.5K style
    if "m" in text.lower():
        match = re.search(r"([\d.]+)m", text, re.IGNORECASE)
        return int(float(match.group(1)) * 1_000_000) if match else None
    if "k" in text.lower():
        match = re.search(r"([\d.]+)k", text, re.IGNORECASE)
        return int(float(match.group(1)) * 1_000) if match else None
    match = re.search(r"(\d+)", text)
    return int(match.group(1)) if match else None


def _parse_duration(text: str | None) -> int | None:
    """Parse duration like '4 weeks', '20 hours', '3 months' to minutes."""
    if not text:
        return None
    text = text.lower()
    
    # Try to extract number
    match = re.search(r"(\d+)", text)
    if not match:
        return None
    
    num = int(match.group(1))
    
    # Convert to minutes
    if "hour" in text:
        return num * 60
    elif "week" in text:
        return num * 7 * 24 * 60  # Assume 40 hours per week of content
    elif "month" in text:
        return num * 30 * 24 * 60  # Rough estimate
    elif "min" in text:
        return num
    
    return None


class CourseraScraper(PlaywrightScraper):
    PROVIDER = "Coursera"
    
    async def _extract_course_metadata(self, page: Page, url: str) -> dict:
        """Visit individual course page to extract detailed metadata."""
        try:
            logger.info(f"Fetching metadata from: {url}")
            await page.goto(url, timeout=15_000, wait_until="domcontentloaded")
            await page.wait_for_timeout(2000)
            
            # Extract rating
            rating = None
            try:
                rating_text = await page.locator("text=/\\d+\\.\\d+.*rating/i").first.inner_text(timeout=3000)
                rating = _parse_rating(rating_text)
            except:
                pass
            
            # Extract difficulty level
            difficulty = None
            try:
                # Look for level badges or text
                level_text = await page.locator("text=/beginner|intermediate|advanced/i").first.inner_text(timeout=3000)
                difficulty = _infer_difficulty(level_text)
            except:
                pass
            
            # Extract duration
            duration = None
            try:
                # Look for duration text like "20 hours", "4 weeks"
                duration_text = await page.locator("text=/\\d+\\s*(hour|week|month)/i").first.inner_text(timeout=3000)
                duration = _parse_duration(duration_text)
            except:
                pass
            
            # Extract enrollment count if visible
            enrollment = None
            try:
                enroll_text = await page.locator("text=/\\d+[KM]?\\s*(student|learner|enrolled)/i").first.inner_text(timeout=3000)
                enrollment = _parse_enrollments(enroll_text)
            except:
                pass
            
            # Extract thumbnail image
            thumbnail = None
            try:
                # Look for course image in meta tags or img tags
                meta_image = await page.locator('meta[property="og:image"]').first.get_attribute("content", timeout=3000)
                if meta_image:
                    thumbnail = meta_image
                else:
                    # Fallback: find main course image
                    img_el = await page.query_selector("img[alt*='Course'], img[alt*='course'], img.course-image")
                    if img_el:
                        thumbnail = await img_el.get_attribute("src")
            except:
                pass
            
            return {
                "rating": rating,
                "difficulty": difficulty,
                "duration_minutes": duration,
                "enrollment_count": enrollment,
                "thumbnail_url": thumbnail
            }
        except Exception as e:
            logger.warning(f"Failed to extract metadata from {url}: {e}")
            return {
                "rating": None,
                "difficulty": None,
                "duration_minutes": None,
                "enrollment_count": None,
                "thumbnail_url": None
            }

    async def scrape(self, query: str, max_results: int = 10) -> list[ScrapedResource]:
        url = _SEARCH_URL.format(query=query.replace(" ", "%20"))
        results: list[ScrapedResource] = []

        async with self:
            page: Page = await self._new_page()
            try:
                logger.info("Coursera scrape: %s", url)
                await self._goto_with_retry(page, url)
                await page.wait_for_timeout(3000)

                # Use the working selector: a[href*='/learn']
                cards = await page.query_selector_all(
                    "a[href*='/learn']"
                )

                # Fallback: try to get parent containers if available
                if not cards or len(cards) < 2:
                    cards = await page.query_selector_all(
                        "article, div[data-testid='product-card'], div[role='article']"
                    )

                logger.info("Coursera found %d cards", len(cards))

                # Phase 1: Collect all course basic info from search page
                course_info_list = []
                for card in cards[:max_results]:
                    try:
                        # Card is a link - get title and URL
                        href = await card.get_attribute("href")
                        if not href or "/learn" not in href:
                            continue
                            
                        title = (await card.inner_text()).strip()
                        if not title or len(title) < 3:
                            continue

                        full_url = (
                            f"https://www.coursera.org{href}"
                            if href.startswith("/")
                            else href
                        )
                        
                        # Check if it's a specialization
                        resource_type = "specialization" if "specializations" in full_url else "course"

                        course_info_list.append({
                            "title": title,
                            "url": full_url,
                            "resource_type": resource_type
                        })
                    except Exception as e:
                        logger.warning("Coursera: failed to parse a card —%s", e)
                        continue

                # Phase 2: Visit each course page for detailed metadata
                for course_info in course_info_list:
                    try:
                        metadata = await self._extract_course_metadata(page, course_info["url"])

                        results.append(
                            ScrapedResource(
                                title=course_info["title"],
                                url=course_info["url"],
                                provider="Coursera",
                                resource_type=course_info["resource_type"],
                                difficulty=metadata["difficulty"],
                                cost="Subscription",
                                platform_rating=metadata["rating"],
                                enrollment_count=metadata["enrollment_count"],
                                duration_minutes=metadata["duration_minutes"],
                                thumbnail_url=metadata["thumbnail_url"],
                                skill_tags=[query],
                            )
                        )
                    except Exception as e:
                        logger.warning("Coursera: failed to extract metadata for %s —%s", course_info["url"], e)
                        continue

            except Exception as e:
                logger.error("Coursera scrape failed: %s", e)
            finally:
                await page.close()

        logger.info("Coursera scrape complete: %d results for '%s'", len(results), query)
        return results
