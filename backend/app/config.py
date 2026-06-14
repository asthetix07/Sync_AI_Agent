"""
Application settings — loaded from .env at startup.
Uses pydantic-settings for validation and type coercion.

Multi-user support:
  - API keys can be comma-separated for rotation across concurrent users.
  - e.g., GEMINI_API_KEYS="key1,key2,key3"
  - If only one key is provided, rotation is a no-op (backward compatible).
"""

from pydantic import field_validator
from pydantic_settings import BaseSettings
from functools import lru_cache
from pathlib import Path
from typing import List


BACKEND_ENV_FILE = Path(__file__).resolve().parents[1] / ".env"


class Settings(BaseSettings):
    # ── Security / JWT ────────────────────────────────────
    secret_key: str  # REQUIRED — used for JWT signing, must be in .env
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 10080  # 7 days (60 min * 24 hr * 7 days)

    # ── CORS ──────────────────────────────────────────────
    backend_cors_origins: List[str] = [
        "http://localhost:3000",
    ]

    # ── LLM (Gemini) — supports multiple keys ────────────
    gemini_api_key: str  # primary key (backward compat)
    gemini_api_keys: str = ""  # comma-separated for rotation
    gemini_classifier_model: str = "gemini-3.1-flash-lite"
    gemini_chat_model: str = "gemini-3.1-flash-lite"

    # ── Web Search (Serper) — supports multiple keys ─────
    serper_api_key: str = ""  # primary key (backward compat)
    serper_api_keys: str = ""  # comma-separated for rotation

    # ── PostgreSQL — vector store (pgvector) ──────────────
    postgre_url: str  # connection string for the vector DB

    # ── PostgreSQL — chat history / threads ───────────────
    pg_url: str  # connection string for chat history tables

    # Google OAuth
    google_client_id: str = ""
    frontend_origin: str = "http://localhost:3000"

    # ── Vector DB backend ─────────────────────────────────
    vector_store_backend: str = "pgvector"

    # ── Model names ──────────────────────────────────────
    embedding_model: str = "gemini-embedding-2-preview"

    # ── History window (number of recent message pairs) ───
    history_window: int = 3

    # ── Sync AI identity system prompt ───────────────────
    sync_ai_system_prompt: str = ""

    @field_validator("sync_ai_system_prompt", mode="before")
    @classmethod
    def _decode_newlines(cls, v: str) -> str:
        """python-dotenv reads .env values as raw strings, so literal
        \\n sequences need to be converted to real newlines."""
        if isinstance(v, str):
            return v.replace("\\n", "\n")
        return v

    @field_validator("backend_cors_origins", mode="before")
    @classmethod
    def _parse_cors_origins(cls, v):
        """Accept a JSON array string or a Python list."""
        if isinstance(v, str):
            import json
            try:
                return json.loads(v)
            except json.JSONDecodeError:
                # Fallback: comma-separated string
                return [origin.strip() for origin in v.split(",")]
        return v

    # ── Memory cache (in-process LRU) ────────────────────
    memory_cache_ttl: int = 300          # seconds before a cached session expires
    memory_cache_max_sessions: int = 100 # max sessions held in-memory

    # ── Cookie settings ──────────────────────────────────
    cookie_secure: bool = False     # Set True in production (HTTPS only)
    cookie_domain: str = ""         # Set to your domain in production

    # ── Redis (Rate limiting / Caching) ──────────────────
    redis_url: str = ""             # Redis connection URI (e.g., redis://localhost:6379)

    # ── Resend (transactional emails) ────────────────────
    resend_api_key: str = ""        # Resend API key for sending emails

    # ── Helper: get effective key list for rotation ──────


    def get_gemini_keys(self) -> str:
        """Return comma-separated keys, falling back to single key."""
        return self.gemini_api_keys if self.gemini_api_keys else self.gemini_api_key

    def get_serper_keys(self) -> str:
        """Return comma-separated keys, falling back to single key."""
        return self.serper_api_keys if self.serper_api_keys else self.serper_api_key

    class Config:
        env_file = str(BACKEND_ENV_FILE)
        env_file_encoding = "utf-8"
        extra = "ignore"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    """Cached settings singleton — parsed once, reused everywhere."""
    return Settings()


settings = get_settings()
