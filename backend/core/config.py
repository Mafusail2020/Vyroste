from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    supabase_url: str
    supabase_service_key: str
    supabase_jwt_secret: str
    frontend_origin: str = "http://localhost:5173"
    backend_origin: str = "http://localhost:8000"

    # WayForPay — optional; checkout returns 503 if not set
    wayforpay_merchant_account: str = ""
    wayforpay_merchant_key: str = ""
    wayforpay_merchant_domain: str = "vyroste.ua"

    # Anthropic (AI Агроном) — optional; /diagnose returns 503 if key unset
    anthropic_api_key: str = ""
    anthropic_model: str = "claude-sonnet-4-6"

    # SendPulse SMTP — optional; GDD alerts skipped silently if not set
    sendpulse_smtp_host: str = "smtp.sendpulse.com"
    sendpulse_smtp_port: int = 587
    sendpulse_smtp_user: str = ""
    sendpulse_smtp_pass: str = ""
    from_email: str = "hello@vyroste.ua"

    @field_validator("supabase_url")
    @classmethod
    def normalize_supabase_url(cls, v: str) -> str:
        for suffix in ("/rest/v1/", "/rest/v1"):
            if v.endswith(suffix):
                v = v[: -len(suffix)]
        return v.rstrip("/")


settings = Settings()
