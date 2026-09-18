import os
import logging
from pathlib import Path
from typing import List

logger = logging.getLogger(__name__)

try:
    from pydantic_settings import BaseSettings

    class Settings(BaseSettings):
        PROJECT_NAME: str = "PS128 Livestock Health & Outbreak Intelligence API"
        VERSION: str = "1.0.0"
        ENVIRONMENT: str = "development"
        DEBUG: bool = True
        
        # FIX 1: Added missing API_V1_STR to the primary Settings class
        API_V1_STR: str = "/api" 
        
        ALLOWED_ORIGINS: str = (
            "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,"
            "http://127.0.0.1:3000,http://localhost:8000,http://127.0.0.1:8000,"
            "https://ps128-livestock-api.onrender.com,https://ps-128-mea4.vercel.app"
        )
        HOST: str = "0.0.0.0"
        PORT: int = 8000
        DATABASE_URL: str = "postgresql://neondb_owner:npg_ELpCBn0XIk3O@ep-quiet-queen-b3dwdnph-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
        DIRECT_URL: str = "postgresql://neondb_owner:npg_ELpCBn0XIk3O@ep-quiet-queen-b3dwdnph.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
        GEMINI_API_KEY_1: str = ""
        GEMINI_API_KEY_2: str = ""
        
        # FIX 2: Updated invalid model name from 3.8 to 2.5
        GEMINI_MODEL: str = "gemini-2.5-flash" 
        
        GROQ_API_KEY: str = ""
        GROQ_MODEL: str = "openai/gpt-oss-120b"

        # Telegram Bot API Configuration (Server-Side Only)
        TELEGRAM_BOT_TOKEN: str = ""
        TELEGRAM_BOT_USERNAME: str = "pashu_raksha_bot"
        TELEGRAM_WEBHOOK_SECRET: str = ""
        TELEGRAM_WEBHOOK_URL: str = ""
        TELEGRAM_API_BASE_URL: str = "https://api.telegram.org"
        FRONTEND_URL: str = "https://ps-128-mea4.vercel.app"

        @property
        def cors_origins(self) -> List[str]:
            return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]

        class Config:
            env_file = Path(__file__).resolve().parents[1] / ".env"
            case_sensitive = True
            extra = "ignore"

    settings = Settings()

except ImportError:
    # Standard library fallback when pydantic_settings is not installed in local environment
    class SettingsFallback:
        def __init__(self):
            self.PROJECT_NAME: str = os.getenv("PROJECT_NAME", "PS128 Livestock Health & Outbreak Intelligence API")
            self.VERSION: str = os.getenv("VERSION", "1.0.0")
            self.ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
            self.DEBUG: bool = os.getenv("DEBUG", "True").lower() in ("true", "1", "t")
            self.API_V1_STR: str = os.getenv("API_V1_STR", "/api")
            self.ALLOWED_ORIGINS: str = os.getenv(
                "ALLOWED_ORIGINS",
                (
                    "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,"
                    "http://127.0.0.1:3000,http://localhost:8000,http://127.0.0.1:8000,"
                    "https://ps128-livestock-api.onrender.com,https://ps-128-mea4.vercel.app"
                ),
            )
            self.HOST: str = os.getenv("HOST", "0.0.0.0")
            self.PORT: int = int(os.getenv("PORT", "8000"))
            self.DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://neondb_owner:npg_ELpCBn0XIk3O@ep-quiet-queen-b3dwdnph-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require")
            self.DIRECT_URL: str = os.getenv("DIRECT_URL", "postgresql://neondb_owner:npg_ELpCBn0XIk3O@ep-quiet-queen-b3dwdnph.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require")
            self.GEMINI_API_KEY_1: str = os.getenv("GEMINI_API_KEY_1", "")
            self.GEMINI_API_KEY_2: str = os.getenv("GEMINI_API_KEY_2", "")
            self.GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-2.5-flash") # Fixed here as well
            self.GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
            self.GROQ_MODEL: str = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")
            self.TELEGRAM_BOT_TOKEN: str = os.getenv("TELEGRAM_BOT_TOKEN", "")
            self.TELEGRAM_BOT_USERNAME: str = os.getenv("TELEGRAM_BOT_USERNAME", "pashu_raksha_bot").lstrip("@").strip()
            self.TELEGRAM_WEBHOOK_SECRET: str = os.getenv("TELEGRAM_WEBHOOK_SECRET", "")
            self.TELEGRAM_WEBHOOK_URL: str = os.getenv("TELEGRAM_WEBHOOK_URL", "")
            self.TELEGRAM_API_BASE_URL: str = os.getenv("TELEGRAM_API_BASE_URL", "https://api.telegram.org")
            self.FRONTEND_URL: str = os.getenv("FRONTEND_URL", "https://ps-128-mea4.vercel.app")

        @property
        def cors_origins(self) -> List[str]:
            return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]

    settings = SettingsFallback()

if (
    not settings.TELEGRAM_BOT_USERNAME
    or not settings.TELEGRAM_BOT_TOKEN
    or not settings.TELEGRAM_WEBHOOK_SECRET
):
    logger.warning(
        "[Telegram Config] TELEGRAM_BOT_USERNAME/TOKEN/WEBHOOK_SECRET appears unconfigured — Telegram linking will not work until these are set on this deployment."
    )