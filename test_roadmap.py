"""Test roadmap generation service."""
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

from app.services.roadmap_service import RoadmapService


async def test_roadmap_generation():
    """Test the roadmap generation service."""
    
    print("=" * 80)
    print("Testing Milestone-Based Roadmap Generation Service")
    print("=" * 80)
    
    # Test queries
    test_queries = [
        "Python Docker",
        "full stack development",
        "data science",
    ]
    
    # Test starting milestones
    test_starting_milestones = [
        ("beginner", "Complete beginner - show all milestones"),
        ("intermediate", "Already know basics - skip beginner level"),
        ("advanced", "Expert level - show only advanced resources"),
    ]
    
    # Choose a query and starting level
    query = test_queries[0]
    starting_milestone, description = test_starting_milestones[1]  # Test intermediate
    
    print(f"\n🎯 Query: '{query}'")
    print(f"📚 Starting Milestone: '{starting_milestone}' ({description})")
    print(f"   Scraping 6 platforms: Coursera, Udemy, YouTube, Dev.to, Medium, Reddit")
    print(f"   Max results per platform: 15")
    print(f"   Target: 12+ resources per milestone")
    print(f"\n⏳ Scraping all platforms (this may take 30-60 seconds)...\n")
    
    try:
        # Initialize service
        service = RoadmapService()
        
        # Generate roadmap
        result = await service.generate_roadmap(
            query=query,
            starting_milestone=starting_milestone,
            max_results_per_platform=15,
            include_social_signals=True,
            min_resources_per_milestone=12,
        )
        
        print("\n" + "=" * 80)
        print("✅ ROADMAP GENERATED SUCCESSFULLY!")
        print("=" * 80)
        
        print(f"\n📊 Summary:")
        print(f"   Total Resources: {result.total_resources}")
        milestone_counts = [f"{k.capitalize()}: {len(v)}" for k, v in result.milestones.items()]
        print(f"   Milestones: {', '.join(milestone_counts)}")
        print(f"   Social Signals: {len(result.social_signals)}")
        print(f"   Platforms Scraped: {', '.join(result.platforms_scraped)}")
        
        # Show each milestone
        milestone_emojis = {
            "beginner": "🌱",
            "intermediate": "📚",
            "advanced": "🚀"
        }
        
        milestone_descriptions = {
            "beginner": "Foundational resources for newcomers",
            "intermediate": "Mid-level resources for those with basics",
            "advanced": "Expert-level resources for mastery"
        }
        
        for milestone_name, resources in result.milestones.items():
            if not resources:
                continue
                
            emoji = milestone_emojis.get(milestone_name, "📖")
            desc = milestone_descriptions.get(milestone_name, "")
            
            print(f"\n{emoji} {milestone_name.upper()} MILESTONE ({len(resources)} resources):")
            print(f"   {desc}")
            print("   " + "-" * 76)
            
            for i, resource in enumerate(resources, 1):
                print(f"\n   {i}. {resource.title}")
                print(f"      Type: {resource.resource_type} | Provider: {resource.provider}")
                print(f"      URL: {resource.url}")
                if resource.duration_minutes:
                    print(f"      Duration: {resource.duration_minutes} min")
                if resource.platform_rating:
                    print(f"      Rating: {resource.platform_rating}")
                if resource.enrollment_count:
                    print(f"      Enrollments/Views: {resource.enrollment_count:,}")
        
        # Show social signals sample
        if result.social_signals:
            print(f"\n💬 Social Signals (showing first 5 of {len(result.social_signals)}):")
            for i, signal in enumerate(result.social_signals[:5], 1):
                print(f"\n   {i}. r/{signal.subreddit} - {signal.upvotes} upvotes")
                print(f"      Author: u/{signal.author}")
                print(f"      {signal.content_snippet[:100]}...")
        
        # Show metadata
        print(f"\n🔧 Metadata:")
        print(f"   Platforms attempted: {result.metadata['platforms_attempted']}")
        print(f"   Platforms successful: {result.metadata['platforms_successful']}")
        print(f"   Starting milestone: {result.metadata['starting_milestone']}")
        if result.metadata.get('resources_per_milestone'):
            rpm = result.metadata['resources_per_milestone']
            rpm_str = ", ".join([f"{k.capitalize()}={v}" for k, v in rpm.items()])
            print(f"   Resources per milestone: {rpm_str}")
        if result.metadata.get('errors'):
            print(f"   Errors: {result.metadata['errors']}")
        
        print("\n" + "=" * 80)
        print("✨ Milestone-based roadmap generation complete!")
        print(f"💡 Tip: Change starting_milestone to 'beginner', 'intermediate', or 'advanced'")
        print(f"    to see roadmaps personalized to your current knowledge level!")
        print("=" * 80)
        
        # Close connections
        await service.close()
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(test_roadmap_generation())
