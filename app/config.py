from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # ── Database ──────────────────────────────────────────────────────────────
    database_url: str = "postgresql+asyncpg://postgres:password@localhost:5432/skillpath"
    database_url_sync: str = "postgresql://postgres:password@localhost:5432/skillpath"

    # ── Gemini ────────────────────────────────────────────────────────────────
    gemini_api_key: str = ""
    gemini_model: str = "gemini-1.5-flash"

    # ── YouTube ───────────────────────────────────────────────────────────────
    youtube_api_key: str = ""

    # ── Reddit ────────────────────────────────────────────────────────────────
    reddit_client_id: str = ""
    reddit_client_secret: str = ""
    reddit_user_agent: str = "SkillPathAI/1.0 (resource-validator)"

    # ── App ───────────────────────────────────────────────────────────────────
    app_env: str = "development"
    app_secret_key: str = "change_this_secret"

    # ── Scraper ───────────────────────────────────────────────────────────────
    scraper_headless: bool = True
    scraper_timeout_ms: int = 30_000
    scraper_concurrency: int = 3
        # ── Exa AI ───────────────────────────────────────────────────────────────
    exa_api_key: str = ""
        # ── Apify ─────────────────────────────────────────────────────────────────
    apify_api_key: str = ""

    # ── Credibility Score Weights ─────────────────────────────────────────────
    weight_resource_metadata: float = 0.35
    weight_community_sentiment: float = 0.30
    weight_platform_engagement: float = 0.20
    weight_time_decay: float = 0.15

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()
