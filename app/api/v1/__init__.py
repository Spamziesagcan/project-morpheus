from fastapi import APIRouter

from app.api.v1.resources import router as resources_router
from app.api.v1.scraper import router as scraper_router

api_v1_router = APIRouter(prefix="/api/v1")
api_v1_router.include_router(resources_router)
api_v1_router.include_router(scraper_router)
