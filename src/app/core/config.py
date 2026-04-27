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
    DEFAULT_MODEL: str = "claude-3-5-sonnet-20240620"
    LOG_LEVEL: str = "INFO"
    
    # Database
    DATABASE_URL: str = ""

    # Auth (JWT)
    JWT_SECRET: str = ""
    JWT_ACCESS_TOKEN_MINUTES: int = 30
    JWT_REFRESH_TOKEN_DAYS: int = 30

    # Telegram bot
    TELEGRAM_BOT_TOKEN: str = ""
    
    # AI Logging (System)
    AI_LOG_SERVER: Optional[str] = None
    AI_LOG_API_KEY: Optional[str] = None
    AI_LOG_DIR: str = ".ai-log"

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
DATABASE_URL = settings.DATABASE_URL
JWT_SECRET = settings.JWT_SECRET
JWT_ACCESS_TOKEN_MINUTES = settings.JWT_ACCESS_TOKEN_MINUTES
JWT_REFRESH_TOKEN_DAYS = settings.JWT_REFRESH_TOKEN_DAYS
TELEGRAM_BOT_TOKEN = settings.TELEGRAM_BOT_TOKEN
