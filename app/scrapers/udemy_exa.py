"""
Udemy scraper using Exa AI.

Exa is an AI-powered search engine that can extract content from web pages,
bypassing Cloudflare and other bot detection.
"""

import logging
import re
from typing import Any

from exa_py import Exa

from app.config import get_settings
from app.scrapers.base import ScrapedResource

logger = logging.getLogger(__name__)
settings = get_settings()


def _parse_rating(text: str) -> float | None:
    """Extract rating from text like '4.5 out of 5' or '4.5 rating'."""
    if not text:
        return None
    match = re.search(r"(\d+\.\d+|\d+)(?:\s*out of|\s*rating|/5)", text.lower())
    if match:
        try:
            return float(match.group(1))
        except (ValueError, TypeError):
            pass
    return None


def _parse_students(text: str) -> int | None:
    """Parse student count like '50,000 students' or '2.5M students'."""
    if not text:
        return None
    
    text = text.upper()
    
    # Handle millions
    match = re.search(r"([\d.]+)\s*M(?:ILLION)?\s*(?:STUDENT|LEARNER)", text)
    if match:
        try:
            return int(float(match.group(1)) * 1_000_000)
        except (ValueError, TypeError):
            pass
    
    # Handle thousands
    match = re.search(r"([\d.]+)\s*K\s*(?:STUDENT|LEARNER)", text)
    if match:
        try:
            return int(float(match.group(1)) * 1_000)
        except (ValueError, TypeError):
            pass
    
    # Handle plain numbers
    match = re.search(r"([\d,]+)\s*(?:STUDENT|LEARNER)", text)
    if match:
        try:
            return int(match.group(1).replace(",", ""))
        except (ValueError, TypeError):
            pass
    
    return None


def _parse_duration(text: str) -> int | None:
    """Parse duration like '12.5 total hours' or '3h 45m'."""
    if not text:
        return None
    
    text = text.lower()
    
    # Try "X total hours" format
    match = re.search(r"([\d.]+)\s*(?:total\s*)?hours?", text)
    if match:
        try:
            return int(float(match.group(1)) * 60)
        except (ValueError, TypeError):
            pass
    
    # Try "Xh Ym" format
    hours_match = re.search(r"(\d+)h", text)
    mins_match = re.search(r"(\d+)m", text)
    if hours_match or mins_match:
        hours = int(hours_match.group(1)) if hours_match else 0
        mins = int(mins_match.group(1)) if mins_match else 0
        return hours * 60 + mins
    
    return None


def _infer_difficulty(text: str) -> str | None:
    """Infer difficulty level from text."""
    if not text:
        return None
    
    text_lower = text.lower()
    
    if "all levels" in text_lower or "all level" in text_lower:
        return "All Levels"
    if any(w in text_lower for w in ["beginner", "introductory", "basics", "fundamentals"]):
        return "Beginner"
    if any(w in text_lower for w in ["intermediate", "practical"]):
        return "Intermediate"
    if any(w in text_lower for w in ["advanced", "expert", "mastery"]):
        return "Advanced"
    
    return None


class UdemyExaScraper:
    """Udemy scraper using Exa AI search."""
    
    PROVIDER = "Udemy"
    
    def __init__(self, api_key: str | None = None):
        """
        Initialize Exa scraper.
        
        Args:
            api_key: Exa API key. If None, reads from settings.
        """
        self.api_key = api_key or settings.exa_api_key
        if not self.api_key:
            raise ValueError(
                "Exa API key required. Set EXA_API_KEY in .env or pass to constructor.\n"
                "Get your key at: https://dashboard.exa.ai/api-keys"
            )
        self.client = Exa(api_key=self.api_key)
    
    async def scrape(self, query: str, max_results: int = 10) -> list[ScrapedResource]:
        """
        Scrape Udemy courses using Exa AI search.
        
        Args:
            query: Search term (e.g., "Python Docker")
            max_results: Maximum number of courses to return
            
        Returns:
            List of ScrapedResource objects
        """
        results: list[ScrapedResource] = []
        
        try:
            logger.info(f"Udemy (Exa): Searching for '{query}'")
            
            # Search Udemy with Exa - use semantic search
            search_query = f"{query} site:udemy.com/course/"
            
            response = self.client.search_and_contents(
                search_query,
                num_results=max_results,
                text={
                    "max_characters": 2000,
                    "include_html_tags": False
                },
                highlights={
                    "num_sentences": 5,
                    "highlights_per_url": 3
                }
            )
            
            logger.info(f"Exa returned {len(response.results)} results")
            
            # Transform Exa results to ScrapedResource
            for result in response.results:
                try:
                    scraped = self._transform_result(result, query)
                    if scraped:
                        results.append(scraped)
                except Exception as e:
                    logger.warning(f"Failed to transform Exa result: {e}")
                    continue
        
        except Exception as e:
            logger.error(f"Exa search failed: {e}")
        
        logger.info(f"Udemy (Exa): Returning {len(results)} results for '{query}'")
        return results
    
    def _transform_result(self, result: Any, query: str) -> ScrapedResource | None:
        """Transform Exa search result to ScrapedResource."""
        
        # Combine all available text for parsing
        all_text = f"{result.title} "
        
        if hasattr(result, 'text') and result.text:
            all_text += f"{result.text} "
        
        if hasattr(result, 'highlights') and result.highlights:
            all_text += " ".join(result.highlights)
        
        # Only process Udemy course URLs
        if not result.url or "udemy.com/course/" not in result.url:
            return None
        
        # Extract metadata from text
        rating = _parse_rating(all_text)
        enrollments = _parse_students(all_text)
        duration = _parse_duration(all_text)
        difficulty = _infer_difficulty(all_text)
        
        # Determine cost (Udemy courses are typically paid unless marked free)
        cost = "Paid"
        if "free" in all_text.lower():
            cost = "Free"
        
        # Get description from highlights or text
        description = None
        if hasattr(result, 'highlights') and result.highlights:
            description = " ".join(result.highlights[:2])
        elif hasattr(result, 'text') and result.text:
            description = result.text[:300]
        
        # Exa might have image field
        thumbnail_url = None
        if hasattr(result, 'image') and result.image:
            thumbnail_url = result.image
        # Fallback: construct standard Udemy course image URL
        # Format: https://img-c.udemycdn.com/course/240x135/COURSE_ID_HERE.jpg
        elif "udemy.com/course/" in result.url:
            # Udemy thumbnails can be constructed but require course ID
            # For now, leave as None unless Exa provides it
            pass
        
        return ScrapedResource(
            title=result.title,
            url=result.url,
            provider=self.PROVIDER,
            resource_type="course",
            description=description,
            difficulty=difficulty,
            cost=cost,
            duration_minutes=duration,
            platform_rating=rating,
            enrollment_count=enrollments,
            thumbnail_url=thumbnail_url,
            skill_tags=[query],
        )
