from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    supabase_url: str
    supabase_service_key: str
    supabase_jwt_secret: str
    frontend_origin: str = "http://localhost:5173"

    @field_validator("supabase_url")
    @classmethod
    def normalize_supabase_url(cls, v: str) -> str:
        for suffix in ("/rest/v1/", "/rest/v1"):
            if v.endswith(suffix):
                v = v[: -len(suffix)]
        return v.rstrip("/")


settings = Settings()
