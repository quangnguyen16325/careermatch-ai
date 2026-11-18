from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

REPOSITORY_ENV_FILE = Path(__file__).resolve().parents[3] / ".env"


class Settings(BaseSettings):
    app_name: str = "CareerMatch AI Service"
    app_version: str = "0.1.0"
    llm_provider: str = "mock"
    llm_api_key: str | None = None

    model_config = SettingsConfigDict(env_file=REPOSITORY_ENV_FILE, extra="ignore")


settings = Settings()
