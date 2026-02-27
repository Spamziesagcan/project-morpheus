"""
init_db.py — Seeds the database with canonical skills and curated resources.

Run once before starting the application:
    python scripts/init_db.py

Creates tables (if not already present) and populates:
  - Skills canonical list
  - A set of hand-curated, high-quality starter resources
"""

import asyncio
import sys
from pathlib import Path

# Allow running from project root
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import AsyncSessionLocal, create_all_tables
from app.models.resource import CostType, DifficultyLevel, Resource, ResourceSkillLink, ResourceType
from app.models.skill import Skill, SkillCategory

# ── Canonical skills ──────────────────────────────────────────────────────────

SKILLS: list[dict] = [
    # Programming Languages
    {"name": "Python", "canonical_name": "python", "category": SkillCategory.programming_language},
    {"name": "JavaScript", "canonical_name": "javascript", "category": SkillCategory.programming_language},
    {"name": "TypeScript", "canonical_name": "typescript", "category": SkillCategory.programming_language},
    {"name": "Go", "canonical_name": "go", "category": SkillCategory.programming_language},
    {"name": "Rust", "canonical_name": "rust", "category": SkillCategory.programming_language},
    {"name": "Java", "canonical_name": "java", "category": SkillCategory.programming_language},
    # Frameworks
    {"name": "React", "canonical_name": "react", "category": SkillCategory.framework},
    {"name": "Node.js", "canonical_name": "nodejs", "category": SkillCategory.framework},
    {"name": "FastAPI", "canonical_name": "fastapi", "category": SkillCategory.framework},
    {"name": "Django", "canonical_name": "django", "category": SkillCategory.framework},
    {"name": "Express.js", "canonical_name": "expressjs", "category": SkillCategory.framework},
    # Databases
    {"name": "PostgreSQL", "canonical_name": "postgresql", "category": SkillCategory.database},
    {"name": "MySQL", "canonical_name": "mysql", "category": SkillCategory.database},
    {"name": "MongoDB", "canonical_name": "mongodb", "category": SkillCategory.database},
    {"name": "Redis", "canonical_name": "redis", "category": SkillCategory.database},
    # DevOps
    {"name": "Docker", "canonical_name": "docker", "category": SkillCategory.devops},
    {"name": "Kubernetes", "canonical_name": "kubernetes", "category": SkillCategory.devops},
    {"name": "Linux", "canonical_name": "linux", "category": SkillCategory.devops},
    {"name": "CI/CD", "canonical_name": "cicd", "category": SkillCategory.devops},
    # Cloud
    {"name": "AWS", "canonical_name": "aws", "category": SkillCategory.cloud},
    {"name": "GCP", "canonical_name": "gcp", "category": SkillCategory.cloud},
    {"name": "Azure", "canonical_name": "azure", "category": SkillCategory.cloud},
    # Concepts
    {"name": "System Design", "canonical_name": "system design", "category": SkillCategory.concept},
    {"name": "Data Structures & Algorithms", "canonical_name": "data structures algorithms", "category": SkillCategory.concept},
    {"name": "REST APIs", "canonical_name": "rest apis", "category": SkillCategory.concept},
    {"name": "GraphQL", "canonical_name": "graphql", "category": SkillCategory.concept},
    {"name": "SQL", "canonical_name": "sql", "category": SkillCategory.database},
    # Data Science / ML
    {"name": "Machine Learning", "canonical_name": "machine learning", "category": SkillCategory.data_science},
    {"name": "Deep Learning", "canonical_name": "deep learning", "category": SkillCategory.data_science},
    {"name": "Data Analysis", "canonical_name": "data analysis", "category": SkillCategory.data_science},
]

# ── Curated seed resources ─────────────────────────────────────────────────────

SEED_RESOURCES: list[dict] = [
    {
        "title": "The Official Python Tutorial",
        "url": "https://docs.python.org/3/tutorial/",
        "provider": "Python.org",
        "resource_type": ResourceType.documentation,
        "difficulty": DifficultyLevel.beginner,
        "cost": CostType.free,
        "description": "Official comprehensive Python language tutorial from python.org.",
        "is_manually_curated": True,
        "skills": ["python"],
    },
    {
        "title": "JavaScript.info — The Modern JavaScript Tutorial",
        "url": "https://javascript.info/",
        "provider": "javascript.info",
        "resource_type": ResourceType.documentation,
        "difficulty": DifficultyLevel.beginner,
        "cost": CostType.free,
        "description": "In-depth, modern JavaScript guide from basics to advanced topics.",
        "is_manually_curated": True,
        "skills": ["javascript"],
    },
    {
        "title": "Docker Official Documentation",
        "url": "https://docs.docker.com/",
        "provider": "Docker",
        "resource_type": ResourceType.documentation,
        "difficulty": DifficultyLevel.beginner,
        "cost": CostType.free,
        "description": "Official Docker documentation covering containers, Compose, and Swarm.",
        "is_manually_curated": True,
        "skills": ["docker"],
    },
    {
        "title": "React Official Docs",
        "url": "https://react.dev/",
        "provider": "Meta / react.dev",
        "resource_type": ResourceType.documentation,
        "difficulty": DifficultyLevel.beginner,
        "cost": CostType.free,
        "description": "Official React documentation with interactive examples and full API reference.",
        "is_manually_curated": True,
        "skills": ["react"],
    },
    {
        "title": "FastAPI Documentation",
        "url": "https://fastapi.tiangolo.com/",
        "provider": "FastAPI",
        "resource_type": ResourceType.documentation,
        "difficulty": DifficultyLevel.intermediate,
        "cost": CostType.free,
        "description": "Official FastAPI docs — one of the best framework docs in the Python ecosystem.",
        "is_manually_curated": True,
        "skills": ["fastapi", "python"],
    },
    {
        "title": "PostgreSQL Official Documentation",
        "url": "https://www.postgresql.org/docs/current/",
        "provider": "PostgreSQL",
        "resource_type": ResourceType.documentation,
        "difficulty": DifficultyLevel.intermediate,
        "cost": CostType.free,
        "description": "Complete reference for PostgreSQL, including SQL syntax, functions, and administration.",
        "is_manually_curated": True,
        "skills": ["postgresql", "sql"],
    },
    {
        "title": "Kubernetes Documentation",
        "url": "https://kubernetes.io/docs/home/",
        "provider": "Kubernetes.io",
        "resource_type": ResourceType.documentation,
        "difficulty": DifficultyLevel.advanced,
        "cost": CostType.free,
        "description": "Official Kubernetes docs covering concepts, tasks, and API reference.",
        "is_manually_curated": True,
        "skills": ["kubernetes", "docker"],
    },
    {
        "title": "Real Python — Python Tutorials",
        "url": "https://realpython.com/",
        "provider": "Real Python",
        "resource_type": ResourceType.article,
        "difficulty": DifficultyLevel.intermediate,
        "cost": CostType.free,
        "description": "High-quality Python tutorials covering web dev, data science, DevOps, and more.",
        "is_manually_curated": True,
        "skills": ["python"],
    },
    {
        "title": "The Missing Semester of Your CS Education",
        "url": "https://missing.csail.mit.edu/",
        "provider": "MIT CSAIL",
        "resource_type": ResourceType.course,
        "difficulty": DifficultyLevel.beginner,
        "cost": CostType.free,
        "description": "MIT course on shell, git, vim, debugging, and profiling — the practical tools CS programs skip.",
        "is_manually_curated": True,
        "skills": ["linux", "cicd"],
    },
    {
        "title": "CS50x — Introduction to Computer Science",
        "url": "https://cs50.harvard.edu/x/",
        "provider": "Harvard / edX",
        "resource_type": ResourceType.course,
        "difficulty": DifficultyLevel.beginner,
        "cost": CostType.free,
        "description": "Harvard's legendary intro to CS. Covers C, Python, SQL, JavaScript, and more.",
        "is_manually_curated": True,
        "skills": ["python", "sql", "javascript"],
    },
]


async def seed(db: AsyncSession) -> None:
    print("Seeding skills…")
    skill_map: dict[str, int] = {}

    for s in SKILLS:
        existing = (
            await db.execute(select(Skill).where(Skill.canonical_name == s["canonical_name"]))
        ).scalar_one_or_none()

        if existing:
            skill_map[s["canonical_name"]] = existing.id
            continue

        skill = Skill(
            name=s["name"],
            canonical_name=s["canonical_name"],
            category=s["category"],
        )
        db.add(skill)
        await db.flush()
        skill_map[s["canonical_name"]] = skill.id
        print(f"  + Skill: {s['name']}")

    print(f"\nSeeding {len(SEED_RESOURCES)} curated resources…")

    for r in SEED_RESOURCES:
        existing = (
            await db.execute(select(Resource).where(Resource.url == r["url"]))
        ).scalar_one_or_none()

        if existing:
            print(f"  ~ Already exists: {r['title'][:60]}")
            continue

        resource = Resource(
            title=r["title"],
            url=r["url"],
            provider=r["provider"],
            resource_type=r["resource_type"],
            description=r.get("description"),
            difficulty=r.get("difficulty"),
            cost=r.get("cost", CostType.free),
            is_manually_curated=r.get("is_manually_curated", False),
        )
        db.add(resource)
        await db.flush()

        for tag in r.get("skills", []):
            sid = skill_map.get(tag)
            if sid:
                db.add(ResourceSkillLink(resource_id=resource.id, skill_id=sid))

        await db.flush()
        print(f"  + Resource: {r['title'][:60]}")

    await db.commit()
    print("\nDatabase seeding complete.")


async def main() -> None:
    print("Creating tables…")
    await create_all_tables()
    async with AsyncSessionLocal() as db:
        await seed(db)


if __name__ == "__main__":
    asyncio.run(main())
