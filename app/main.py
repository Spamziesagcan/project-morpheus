import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import api_v1_router
from app.config import get_settings
from app.database import create_all_tables

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)

settings = get_settings()

app = FastAPI(
    title="SkillPath AI — Resource Scraping Service",
    description=(
        "Scrapes learning resources from Udemy, YouTube, Medium, Dev.to, and Coursera. "
        "Validates resource quality via Reddit + X social signals and a composite "
        "credibility score (VADER + Gemini sentiment, engagement weighting, time decay)."
    ),
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if not settings.is_production else [],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routes ────────────────────────────────────────────────────────────────────
app.include_router(api_v1_router)


# ── Startup / Shutdown ────────────────────────────────────────────────────────
@app.on_event("startup")
async def on_startup() -> None:
    logger.info("SkillPath AI resource service starting up…")
    if not settings.is_production:
        # Auto-create tables in dev; use Alembic migrations in production
        await create_all_tables()
        logger.info("Database tables ensured.")


@app.on_event("shutdown")
async def on_shutdown() -> None:
    logger.info("SkillPath AI resource service shutting down.")


# ── Health check ──────────────────────────────────────────────────────────────
@app.get("/health", tags=["Health"])
async def health() -> dict:
    return {"status": "ok", "env": settings.app_env}
