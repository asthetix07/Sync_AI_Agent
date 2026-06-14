"""
Security utilities — JWT creation, verification, and httpOnly cookie helpers.

All tokens are signed with SECRET_KEY from .env using HS256.
Cookies are httpOnly + SameSite=Lax to prevent XSS/CSRF.
"""

from datetime import datetime, timedelta, timezone
from typing import Optional

from jose import JWTError, jwt
from fastapi import HTTPException, Request, Response, status

from app.config import get_settings
from app.utils.logger import logger


# ── JWT Token Creation ────────────────────────────────────
def create_access_token(
    subject: str,
    extra_claims: Optional[dict] = None,
) -> str:
    """
    Create a signed JWT access token.

    Args:
        subject: The token subject (typically user openid or email).
        extra_claims: Optional additional claims to include in the payload.

    Returns:
        Encoded JWT string.
    """
    settings = get_settings()
    now = datetime.now(timezone.utc)
    expire = now + timedelta(minutes=settings.access_token_expire_minutes)
    payload = {
        "sub": subject,
        "iat": now,
        "exp": expire,
    }
    if extra_claims:
        payload.update(extra_claims)
    return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)


# ── JWT Token Verification ────────────────────────────────
def verify_access_token(token: str) -> dict:
    """
    Decode and verify a JWT token.

    Returns:
        The decoded payload dict.

    Raises:
        HTTPException 401 if the token is invalid or expired.
    """
    settings = get_settings()
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(
            token,
            settings.secret_key,
            algorithms=[settings.algorithm],
        )
        subject: str = payload.get("sub")
        if subject is None:
            raise credentials_exception
        return payload
    except JWTError as e:
        logger.warning(f"JWT verification failed: {e}")
        raise credentials_exception


# ── Cookie Helpers ────────────────────────────────────────
COOKIE_NAME = "access_token"


def set_auth_cookie(response: Response, token: str) -> None:
    """Set an httpOnly secure cookie containing the JWT.

    The cookie persists for the full token lifetime (default 7 days).
    It is only cleared when the user explicitly logs out, or clears
    browser cookies/cache. There is no automatic 30-minute expiry.
    """
    settings = get_settings()
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        httponly=True,                    # JS cannot read this cookie
        secure=settings.cookie_secure,    # True in production (HTTPS only)
        samesite="lax",                   # CSRF protection
        max_age=settings.access_token_expire_minutes * 60,  # e.g. 7 days = 604800 s
        path="/",
        domain=settings.cookie_domain or None,
    )


def clear_auth_cookie(response: Response) -> None:
    """Delete the auth cookie (logout)."""
    settings = get_settings()
    response.delete_cookie(
        key=COOKIE_NAME,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        path="/",
        domain=settings.cookie_domain or None,
    )


def get_token_from_cookie(request: Request) -> Optional[str]:
    """Extract the JWT from the httpOnly cookie."""
    return request.cookies.get(COOKIE_NAME)
