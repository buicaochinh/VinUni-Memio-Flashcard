import os
from dotenv import load_dotenv

load_dotenv()

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
DEFAULT_MODEL = os.getenv("DEFAULT_MODEL", "claude-sonnet-4-20250514")
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///data/flashcards.db")
