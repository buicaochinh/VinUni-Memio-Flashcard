from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    """
    Application settings using Pydantic Settings.
    Loads variables from environment variables or .env file.
    """
    
    # API Keys
    ANTHROPIC_API_KEY: str = ""
    OPENAI_API_KEY: str = ""
    OPENROUTER_API_KEY: str = ""
    
    # App Config
    DEFAULT_MODEL: str = "gpt-4o-mini"
    LOG_LEVEL: str = "INFO"
    APP_TIMEZONE: str = "Asia/Ho_Chi_Minh"
    
    # Database
    DATABASE_URL: str = ""

    # Auth (JWT)
    JWT_SECRET: str = ""
    JWT_ACCESS_TOKEN_MINUTES: int = 30
    JWT_REFRESH_TOKEN_DAYS: int = 30

    # Telegram bot
    TELEGRAM_BOT_TOKEN: str = ""

    # Notion OAuth / API
    NOTION_CLIENT_ID: str = ""
    NOTION_CLIENT_SECRET: str = ""
    NOTION_REDIRECT_URI: str = ""
    NOTION_FRONTEND_REDIRECT_URL: str = "http://localhost:3000/integrations"
    NOTION_API_VERSION: str = "2022-06-28"
    
    # AI Logging (System)
    AI_LOG_SERVER: Optional[str] = None
    AI_LOG_API_KEY: Optional[str] = None
    AI_LOG_DIR: str = ".ai-log"

    # Image generation
    OPENAI_IMAGE_ENABLED: bool = True   # set False để tắt DALL-E 3, tiết kiệm chi phí

    # Notifications
    CRON_SECRET: str = ""
    APP_URL: str = "https://mem.io.vn"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"  # Allow extra environment variables without error
    )

# Instantiate settings
settings = Settings()

# Backward compatibility exports
ANTHROPIC_API_KEY = settings.ANTHROPIC_API_KEY
OPENAI_API_KEY = settings.OPENAI_API_KEY
OPENROUTER_API_KEY = settings.OPENROUTER_API_KEY
DEFAULT_MODEL = settings.DEFAULT_MODEL
LOG_LEVEL = settings.LOG_LEVEL
APP_TIMEZONE = settings.APP_TIMEZONE
DATABASE_URL = settings.DATABASE_URL
JWT_SECRET = settings.JWT_SECRET
JWT_ACCESS_TOKEN_MINUTES = settings.JWT_ACCESS_TOKEN_MINUTES
JWT_REFRESH_TOKEN_DAYS = settings.JWT_REFRESH_TOKEN_DAYS
TELEGRAM_BOT_TOKEN = settings.TELEGRAM_BOT_TOKEN
NOTION_CLIENT_ID = settings.NOTION_CLIENT_ID
NOTION_CLIENT_SECRET = settings.NOTION_CLIENT_SECRET
NOTION_REDIRECT_URI = settings.NOTION_REDIRECT_URI
NOTION_FRONTEND_REDIRECT_URL = settings.NOTION_FRONTEND_REDIRECT_URL
NOTION_API_VERSION = settings.NOTION_API_VERSION
OPENAI_IMAGE_ENABLED = settings.OPENAI_IMAGE_ENABLED
