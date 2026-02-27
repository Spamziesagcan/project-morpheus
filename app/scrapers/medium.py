"""
Medium scraper (Playwright).

Medium has no public REST API for article search.
We scrape the search results page.
"""

import logging

from playwright.async_api import Page

from app.scrapers.base import PlaywrightScraper, ScrapedResource

logger = logging.getLogger(__name__)

_SEARCH_URL = "https://medium.com/search?q={query}&source=post_page"


def _estimate_duration(read_time_text: str | None) -> int | None:
    """Convert '5 min read' → 5."""
    if not read_time_text:
        return None
    import re
    match = re.search(r"(\d+)\s*min", read_time_text, re.IGNORECASE)
    return int(match.group(1)) if match else None


def _is_relevant(query: str, title: str, description: str | None) -> bool:
    """Check if an article is relevant to the search query."""
    query_lower = query.lower()
    query_keywords = set(query_lower.split())
    
    # Check title
    title_lower = title.lower()
    if any(keyword in title_lower for keyword in query_keywords):
        return True
    
    # Check description
    if description:
        desc_lower = description.lower()
        if any(keyword in desc_lower for keyword in query_keywords):
            return True
    
    return False


class MediumScraper(PlaywrightScraper):
    PROVIDER = "Medium"

    async def scrape(self, query: str, max_results: int = 10) -> list[ScrapedResource]:
        url = _SEARCH_URL.format(query=query.replace(" ", "%20"))
        results: list[ScrapedResource] = []

        async with self:
            page: Page = await self._new_page()
            try:
                logger.info("Medium scrape: %s", url)
                await self._goto_with_retry(page, url)
                await page.wait_for_timeout(3000)  # JS-heavy page needs extra time

                # Medium renders article cards with these selectors (as of 2024)
                cards = await page.query_selector_all("article")

                if not cards:
                    # fallback: grab all result divs
                    cards = await page.query_selector_all(
                        "[data-testid='post-preview'], .postItem"
                    )

                logger.info("Medium found %d article cards", len(cards))

                # Process more cards to account for relevance filtering
                for card in cards[:max_results * 2]:
                    if len(results) >= max_results:
                        break
                        
                    try:
                        # Title is in h2, and h2's parent is the article link
                        h2_el = await card.query_selector("h2")
                        if not h2_el:
                            continue

                        title = (await h2_el.inner_text()).strip()
                        
                        # Find the link that contains the h2 (article link)
                        href = await h2_el.evaluate("""
                            h2 => {
                                let el = h2;
                                while (el && el.tagName !== 'A') {
                                    el = el.parentElement;
                                }
                                return el ? el.href : null;
                            }
                        """)
                        
                        if not href:
                            continue
                        
                        # Strip tracking params
                        full_url = href.split("?")[0]
                        if not full_url.startswith("http"):
                            full_url = f"https://medium.com{full_url}"

                        # Subtitle / description (usually in h3 or p)
                        desc_el = await card.query_selector("h3, p")
                        description = (await desc_el.inner_text()).strip() if desc_el else None

                        # Thumbnail image - usually in img tag within the card
                        img_el = await card.query_selector("img")
                        thumbnail_url = None
                        if img_el:
                            thumbnail_url = await img_el.get_attribute("src")
                            # Handle relative URLs
                            if thumbnail_url and not thumbnail_url.startswith("http"):
                                thumbnail_url = f"https://medium.com{thumbnail_url}"

                        # Read time
                        time_el = await card.query_selector("span")
                        read_time_text = None
                        if time_el:
                            text = await time_el.inner_text()
                            if "min read" in text.lower():
                                read_time_text = text

                        if not title or not full_url:
                            continue

                        # Filter by relevance
                        if not _is_relevant(query, title, description):
                            logger.debug(f"Medium: Skipping irrelevant article: {title}")
                            continue

                        results.append(
                            ScrapedResource(
                                title=title,
                                url=full_url,
                                provider=self.PROVIDER,
                                resource_type="article",
                                description=description[:300] if description else None,
                                cost="Free",
                                duration_minutes=_estimate_duration(read_time_text),
                                thumbnail_url=thumbnail_url,
                                skill_tags=[query],
                            )
                        )
                    except Exception as e:
                        logger.warning("Medium: failed to parse a card — %s", e)
                        continue

            except Exception as e:
                logger.error("Medium scrape failed: %s", e)
            finally:
                await page.close()

        logger.info("Medium scrape complete: %d results for '%s'", len(results), query)
        return results
