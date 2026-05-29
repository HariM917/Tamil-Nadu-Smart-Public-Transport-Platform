import os
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    """Application configuration loaded from environment variables."""

    # App
    APP_NAME: str = "TN Smart Transport"
    ENVIRONMENT: str = "development"  # development | staging | production
    DEBUG: bool = True
    API_PREFIX: str = "/api"
    LOG_LEVEL: str = "INFO"

    # Database
    DATABASE_URL: str = "postgresql://tn_admin:tn_secure_pass_2024@localhost:5432/tn_transport"

    # JWT — IMPORTANT: Override SECRET_KEY in production via environment variable
    SECRET_KEY: str = "tn-transport-dev-secret-key-2024-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours

    # CORS
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:5173"

    # File Upload
    UPLOAD_DIR: str = "uploads"
    MAX_FILE_SIZE: int = 5242880  # 5MB

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()

# Ensure upload directory exists
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
