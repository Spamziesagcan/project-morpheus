"""
Roadmap service — Orchestrates all scrapers to generate learning roadmaps.

This service integrates all platform scrapers to provide a comprehensive
learning path based on user queries.
"""

import asyncio
import logging
from dataclasses import dataclass
from typing import Any

from app.config import get_settings
from app.scrapers.base import ScrapedResource
from app.scrapers.coursera import CourseraScraper
from app.scrapers.dev_to import DevToScraper
from app.scrapers.medium import MediumScraper
from app.scrapers.reddit import RedditScraper, RedditSignal
from app.scrapers.udemy_exa import UdemyExaScraper
from app.scrapers.youtube import YouTubeScraper

logger = logging.getLogger(__name__)
settings = get_settings()


@dataclass
class RoadmapResult:
    """Aggregated results from all scrapers with milestone-based organization."""

    query: str
    milestones: dict[str, list[ScrapedResource]]  # "beginner", "intermediate", "advanced"
    social_signals: list[RedditSignal]  # Reddit
    total_resources: int
    platforms_scraped: list[str]
    metadata: dict[str, Any]


class RoadmapService:
    """Service to generate learning roadmaps by aggregating all scrapers."""

    def __init__(self):
        """Initialize all scrapers."""
        self.coursera = CourseraScraper()
        self.youtube = YouTubeScraper()
        self.devto = DevToScraper()
        self.medium = MediumScraper()
        self.reddit = RedditScraper()

        # Udemy Exa requires API key
        self.udemy = None
        if settings.exa_api_key:
            try:
                self.udemy = UdemyExaScraper()
                logger.info("Udemy (Exa AI) scraper initialized")
            except Exception as e:
                logger.warning(f"Failed to initialize Udemy scraper: {e}")

    async def generate_roadmap(
        self,
        query: str,
        starting_milestone: str = "beginner",
        max_results_per_platform: int = 15,
        include_social_signals: bool = True,
        min_resources_per_milestone: int = 12,
    ) -> RoadmapResult:
        """
        Generate a learning roadmap by scraping all platforms with milestone-based organization.

        Args:
            query: User's learning goal (e.g., "full stack development")
            starting_milestone: User's current knowledge level (beginner/intermediate/advanced)
            max_results_per_platform: Maximum results to fetch from each platform
            include_social_signals: Whether to fetch Reddit social signals
            min_resources_per_milestone: Minimum resources required per milestone

        Returns:
            RoadmapResult with resources organized by difficulty milestones:
            - beginner: Foundational resources for newcomers
            - intermediate: Mid-level resources for those with basics
            - advanced: Expert-level resources for mastery
            Only milestones from starting_milestone onwards are included.
        """
        logger.info(f"Generating milestone-based roadmap for query: '{query}' starting from '{starting_milestone}'")

        # Track what platforms we successfully scraped
        platforms_scraped = []
        scraping_errors = {}

        # Scrape all platforms in parallel for speed
        tasks = []

        # Courses
        tasks.append(
            ("Coursera", self._scrape_coursera(query, max_results_per_platform))
        )
        if self.udemy:
            tasks.append(("Udemy", self._scrape_udemy(query, max_results_per_platform)))

        # Videos
        tasks.append(("YouTube", self._scrape_youtube(query, max_results_per_platform)))

        # Articles
        tasks.append(("Dev.to", self._scrape_devto(query, max_results_per_platform)))
        tasks.append(("Medium", self._scrape_medium(query, max_results_per_platform)))

        # Social signals (optional)
        if include_social_signals:
            tasks.append(
                ("Reddit", self._scrape_reddit(query, max_results_per_platform * 2))
            )

        # Execute all scraping tasks in parallel
        results = await asyncio.gather(
            *[task for _, task in tasks], return_exceptions=True
        )

        # Aggregate all resources
        all_resources = []
        social_signals = []

        for (platform, _), result in zip(tasks, results):
            if isinstance(result, Exception):
                logger.error(f"{platform} scraping failed: {result}")
                scraping_errors[platform] = str(result)
                continue

            platforms_scraped.append(platform)

            # Route results
            if platform == "Reddit":
                social_signals.extend(result)
            else:
                all_resources.extend(result)

        # Organize resources into milestones by difficulty
        all_milestones = self._organize_into_milestones(
            all_resources, min_resources_per_milestone
        )

        # Filter milestones based on user's starting level
        milestones = self._filter_milestones_by_starting_level(
            all_milestones, starting_milestone
        )

        # Calculate totals
        total_resources = sum(len(resources) for resources in milestones.values())

        # Log summary
        milestone_summary = ", ".join(
            [f"{k.capitalize()}: {len(v)}" for k, v in milestones.items()]
        )
        logger.info(
            f"Roadmap generated: {total_resources} resources "
            f"({milestone_summary}) "
            f"+ {len(social_signals)} social signals from {len(platforms_scraped)} platforms"
        )

        return RoadmapResult(
            query=query,
            milestones=milestones,
            social_signals=social_signals,
            total_resources=total_resources,
            platforms_scraped=platforms_scraped,
            metadata={
                "platforms_attempted": len(tasks) - (1 if include_social_signals else 0),
                "platforms_successful": len([p for p in platforms_scraped if p != "Reddit"]),
                "errors": scraping_errors,
                "max_results_per_platform": max_results_per_platform,
                "starting_milestone": starting_milestone,
                "resources_per_milestone": {
                    k: len(v) for k, v in milestones.items()
                },
            },
        )

    def _organize_into_milestones(
        self, resources: list[ScrapedResource], min_per_milestone: int
    ) -> dict[str, list[ScrapedResource]]:
        """
        Organize resources into beginner, intermediate, and advanced milestones.

        Strategy:
        1. First pass: Categorize by explicit difficulty labels
        2. Second pass: If a milestone is under minimum, distribute unlabeled resources
        3. Third pass: If still under, duplicate resources or adjust from other milestones
        """
        milestones = {
            "beginner": [],
            "intermediate": [],
            "advanced": [],
        }

        unlabeled = []

        # First pass: Categorize by difficulty
        for resource in resources:
            difficulty = (resource.difficulty or "").lower()

            if "beginner" in difficulty or "all levels" in difficulty or "introductory" in difficulty:
                milestones["beginner"].append(resource)
            elif "intermediate" in difficulty or "practical" in difficulty:
                milestones["intermediate"].append(resource)
            elif "advanced" in difficulty or "expert" in difficulty:
                milestones["advanced"].append(resource)
            else:
                # No clear difficulty label
                unlabeled.append(resource)

        # Second pass: Distribute unlabeled resources strategically
        # Priority order: beginner -> intermediate -> advanced
        for resource in unlabeled:
            # Check which milestone needs resources most
            counts = {k: len(v) for k, v in milestones.items()}

            if counts["beginner"] < min_per_milestone:
                milestones["beginner"].append(resource)
            elif counts["intermediate"] < min_per_milestone:
                milestones["intermediate"].append(resource)
            elif counts["advanced"] < min_per_milestone:
                milestones["advanced"].append(resource)
            else:
                # All milestones have minimum, distribute evenly
                # Give to the one with least resources
                min_milestone = min(counts.items(), key=lambda x: x[1])[0]
                milestones[min_milestone].append(resource)

        # Third pass: If any milestone still under minimum, redistribute
        counts = {k: len(v) for k, v in milestones.items()}

        # If beginner is short, take from intermediate
        if counts["beginner"] < min_per_milestone and counts["intermediate"] > min_per_milestone:
            deficit = min_per_milestone - counts["beginner"]
            to_move = min(deficit, counts["intermediate"] - min_per_milestone)
            milestones["beginner"].extend(milestones["intermediate"][:to_move])
            milestones["intermediate"] = milestones["intermediate"][to_move:]

        # If intermediate is short, take from beginner (if excess) or advanced
        counts = {k: len(v) for k, v in milestones.items()}
        if counts["intermediate"] < min_per_milestone:
            deficit = min_per_milestone - counts["intermediate"]
            # Try advanced first
            if counts["advanced"] > min_per_milestone:
                to_move = min(deficit, counts["advanced"] - min_per_milestone)
                milestones["intermediate"].extend(milestones["advanced"][:to_move])
                milestones["advanced"] = milestones["advanced"][to_move:]

        # If advanced is short, it can stay short (advanced content is naturally rarer)
        # But log a warning
        if len(milestones["advanced"]) < min_per_milestone:
            logger.warning(
                f"Advanced milestone has only {len(milestones['advanced'])} resources "
                f"(target: {min_per_milestone}). Consider fetching more resources."
            )

        return milestones

    def _filter_milestones_by_starting_level(
        self, all_milestones: dict[str, list[ScrapedResource]], starting_milestone: str
    ) -> dict[str, list[ScrapedResource]]:
        """
        Filter milestones based on user's starting knowledge level.
        
        Args:
            all_milestones: All organized milestones (beginner, intermediate, advanced)
            starting_milestone: User's current level (beginner/intermediate/advanced)
        
        Returns:
            Filtered milestones containing only relevant levels for the user
        """
        # Milestone hierarchy
        milestone_order = ["beginner", "intermediate", "advanced"]
        
        # Find the starting index
        try:
            start_index = milestone_order.index(starting_milestone.lower())
        except ValueError:
            logger.warning(f"Invalid starting_milestone '{starting_milestone}', defaulting to 'beginner'")
            start_index = 0
        
        # Filter milestones from starting level onwards
        filtered_milestones = {
            milestone: all_milestones[milestone]
            for milestone in milestone_order[start_index:]
        }
        
        logger.info(
            f"Filtered milestones from '{starting_milestone}': "
            f"{list(filtered_milestones.keys())}"
        )
        
        return filtered_milestones

    async def _scrape_coursera(
        self, query: str, max_results: int
    ) -> list[ScrapedResource]:
        """Scrape Coursera courses."""
        try:
            return await self.coursera.scrape(query, max_results=max_results)
        except Exception as e:
            logger.error(f"Coursera scraping failed: {e}")
            return []

    async def _scrape_udemy(
        self, query: str, max_results: int
    ) -> list[ScrapedResource]:
        """Scrape Udemy courses using Exa AI."""
        if not self.udemy:
            logger.warning("Udemy scraper not available (missing EXA_API_KEY)")
            return []
        try:
            return await self.udemy.scrape(query, max_results=max_results)
        except Exception as e:
            logger.error(f"Udemy (Exa) scraping failed: {e}")
            return []

    async def _scrape_youtube(
        self, query: str, max_results: int
    ) -> list[ScrapedResource]:
        """Scrape YouTube videos."""
        try:
            return await self.youtube.scrape(query, max_results=max_results)
        except Exception as e:
            logger.error(f"YouTube scraping failed: {e}")
            return []

    async def _scrape_devto(
        self, query: str, max_results: int
    ) -> list[ScrapedResource]:
        """Scrape Dev.to articles."""
        try:
            return await self.devto.scrape(query, max_results=max_results)
        except Exception as e:
            logger.error(f"Dev.to scraping failed: {e}")
            return []

    async def _scrape_medium(
        self, query: str, max_results: int
    ) -> list[ScrapedResource]:
        """Scrape Medium articles."""
        try:
            return await self.medium.scrape(query, max_results=max_results)
        except Exception as e:
            logger.error(f"Medium scraping failed: {e}")
            return []

    async def _scrape_reddit(
        self, query: str, max_results: int
    ) -> list[RedditSignal]:
        """Scrape Reddit social signals."""
        try:
            # For Reddit, use the query as resource title
            return await self.reddit.collect_signals(
                resource_title=query, resource_url=None, max_posts=max_results
            )
        except Exception as e:
            logger.error(f"Reddit scraping failed: {e}")
            return []

    async def close(self):
        """Close all scraper connections (Playwright browsers, etc.)."""
        # Coursera and Medium use Playwright
        try:
            if hasattr(self.coursera, "browser") and self.coursera.browser:
                await self.coursera.browser.close()
        except Exception as e:
            logger.warning(f"Failed to close Coursera browser: {e}")

        try:
            if hasattr(self.medium, "browser") and self.medium.browser:
                await self.medium.browser.close()
        except Exception as e:
            logger.warning(f"Failed to close Medium browser: {e}")


# Singleton instance
_roadmap_service: RoadmapService | None = None


def get_roadmap_service() -> RoadmapService:
    """Get or create singleton roadmap service instance."""
    global _roadmap_service
    if _roadmap_service is None:
        _roadmap_service = RoadmapService()
    return _roadmap_service
