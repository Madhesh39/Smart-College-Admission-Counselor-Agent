import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Smart College Admission Counselor Agent"
    API_V1_STR: str = "/api"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "supersecretjwtkeyforcollegeproject123!")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # Database Connection (SQLite by default with absolute path, or PostgreSQL if DATABASE_URL env var is provided)
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        f"sqlite:///{os.path.abspath(os.path.join(os.path.dirname(__file__), '../../college_counselor.db'))}"
    )

    # AI Configurations
    AI_ENABLED: bool = os.getenv("AI_ENABLED", "False").lower() in ("true", "1", "t")
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    OPENAI_API_BASE: str = os.getenv("OPENAI_API_BASE", "https://api.openai.com/v1")
    LLM_MODEL: str = os.getenv("LLM_MODEL", "gpt-4o-mini")

    # Recommendation Weights (Must sum to 1.0/100%)
    WEIGHT_ACADEMIC: float = 0.25
    WEIGHT_ENTRANCE: float = 0.25
    WEIGHT_COURSE: float = 0.15
    WEIGHT_BUDGET: float = 0.10
    WEIGHT_LOCATION: float = 0.10
    WEIGHT_PLACEMENT: float = 0.10
    WEIGHT_PREFERENCE: float = 0.05

    class Config:
        case_sensitive = True

settings = Settings()
