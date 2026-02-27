import sys
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from logger import get_logger
from auth.router import router as auth_router
from user_profile.routes import router as profile_router
from ai_resume_builder.routes import router as ai_resume_router
from portfolio.routes import router as portfolio_router
from presentation.routes import router as presentation_router
from career_recommender.routes import router as career_router

logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup/shutdown events."""
    # Startup
    logger.info("Starting Morpheus application...")
    logger.info("Application started successfully")
    yield
    # Shutdown
    logger.info("Shutting down application...")
    logger.info("Application shut down")


app = FastAPI(title="Morpheus API", lifespan=lifespan)

# Configure CORS
import os
allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(profile_router)
app.include_router(ai_resume_router)
app.include_router(portfolio_router)
app.include_router(presentation_router)
app.include_router(career_router)

@app.get("/")
def home():
    logger.info("Health check endpoint accessed")
    return {"message": "Morpheus API Online"}
