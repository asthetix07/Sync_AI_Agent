"""
Rate limiter instance — shared across all route handlers.

Defined in its own module to avoid circular imports between
main.py and route files (chat.py, upload.py, session.py, oauth.py).
"""

from slowapi import Limiter
from slowapi.util import get_remote_address
from app.config import settings

# Initialize slowapi limiter.
# If redis_url is configured, use it as the backend storage for rate limiting across multiple processes.
limiter_kwargs = {"key_func": get_remote_address}
if settings.redis_url:
    limiter_kwargs["storage_uri"] = settings.redis_url

limiter = Limiter(**limiter_kwargs)
