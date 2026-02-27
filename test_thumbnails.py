"""Test thumbnail extraction from scrapers."""
import asyncio
import sys
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
script_dir = Path(__file__).parent.absolute()
env_file = script_dir / ".env"
load_dotenv(dotenv_path=env_file, override=True)

# Add parent directory to path
sys.path.insert(0, str(script_dir))

from app.scrapers.youtube import YouTubeScraper
from app.scrapers.dev_to import DevToScraper


async def test_thumbnails():
    """Test thumbnail extraction from different scrapers."""
    
    print("=" * 80)
    print("Testing Thumbnail Extraction")
    print("=" * 80)
    
    query = "Python Docker"
    
    # Test YouTube thumbnails
    print("\n📺 Testing YouTube Thumbnails...")
    youtube = YouTubeScraper()
    youtube_results = await youtube.scrape(query, max_results=3)
    
    for i, result in enumerate(youtube_results, 1):
        print(f"\n{i}. {result.title}")
        print(f"   URL: {result.url}")
        print(f"   Thumbnail: {result.thumbnail_url or 'NO THUMBNAIL'}")
    
    # Test Dev.to thumbnails
    print("\n\n📝 Testing Dev.to Thumbnails...")
    devto = DevToScraper()
    devto_results = await devto.scrape(query, max_results=3)
    
    for i, result in enumerate(devto_results, 1):
        print(f"\n{i}. {result.title}")
        print(f"   URL: {result.url}")
        print(f"   Thumbnail: {result.thumbnail_url or 'NO THUMBNAIL'}")
    
    print("\n" + "=" * 80)
    print("Thumbnail test complete!")
    print("=" * 80)


if __name__ == "__main__":
    asyncio.run(test_thumbnails())
