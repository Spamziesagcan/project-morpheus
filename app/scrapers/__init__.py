from app.scrapers.base import PlaywrightScraper, ScrapedResource
from app.scrapers.udemy import UdemyScraper
from app.scrapers.youtube import YouTubeScraper
from app.scrapers.medium import MediumScraper
from app.scrapers.dev_to import DevToScraper
from app.scrapers.coursera import CourseraScraper
from app.scrapers.reddit import RedditScraper
from app.scrapers.twitter_x import TwitterXScraper

__all__ = [
    "PlaywrightScraper",
    "ScrapedResource",
    "UdemyScraper",
    "YouTubeScraper",
    "MediumScraper",
    "DevToScraper",
    "CourseraScraper",
    "RedditScraper",
    "TwitterXScraper",
]
