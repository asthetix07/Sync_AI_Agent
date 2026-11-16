"""
Security utilities — JWT creation, verification, and httpOnly cookie helpers.

All tokens are signed with SECRET_KEY from .env using HS256.
Cookies are httpOnly + SameSite=Lax to prevent XSS/CSRF.

Token strategy:
  - Access token  : short-lived (configurable, default 7 days), stored in httpOnly cookie.
  - Refresh token : long-lived (30 days), stored in a separate httpOnly cookie.
  - When the access token expires, the frontend calls /auth/refresh,
    which verifies the refresh token and issues a fresh access token
    without requiring the user to re-authenticate with Google.
"""

from datetime import datetime, timedelta, timezone
from typing import Optional

from jose import JWTError, jwt
from fastapi import HTTPException, Request, Response, status

from app.config import get_settings
from app.utils.logger import logger


# ── Constants ─────────────────────────────────────────────
COOKIE_NAME = "access_token"
REFRESH_COOKIE_NAME = "refresh_token"
REFRESH_TOKEN_EXPIRE_DAYS = 30


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
        "type": "access",
    }
    if extra_claims:
        payload.update(extra_claims)
    return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)


def create_refresh_token(subject: str) -> str:
    """
    Create a long-lived refresh token.

    Contains only the subject (user openid) — no profile data.
    Used solely to mint new access tokens without re-authenticating.
    """
    settings = get_settings()
    now = datetime.now(timezone.utc)
    expire = now + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    payload = {
        "sub": subject,
        "iat": now,
        "exp": expire,
        "type": "refresh",
    }
    return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)


# ── JWT Token Verification ────────────────────────────────
def verify_access_token(token: str) -> dict:
    """
    Decode and verify a JWT access token.

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
        # Reject refresh tokens used as access tokens
        if payload.get("type") == "refresh":
            logger.warning("Rejected refresh token used as access token")
            raise credentials_exception
        return payload
    except JWTError as e:
        logger.warning(f"JWT verification failed: {e}")
        raise credentials_exception


def verify_refresh_token(token: str) -> dict:
    """
    Decode and verify a JWT refresh token.

    Returns:
        The decoded payload dict (contains only 'sub', 'iat', 'exp', 'type').

    Raises:
        HTTPException 401 if the token is invalid, expired, or wrong type.
    """
    settings = get_settings()
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired refresh token",
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
        if payload.get("type") != "refresh":
            logger.warning("Rejected non-refresh token used as refresh token")
            raise credentials_exception
        return payload
    except JWTError as e:
        logger.warning(f"Refresh token verification failed: {e}")
        raise credentials_exception


# ── Cookie Helpers ────────────────────────────────────────

def set_auth_cookie(response: Response, token: str) -> None:
    """Set an httpOnly secure cookie containing the JWT access token.

    The cookie persists for the full token lifetime (default 7 days).
    It is only cleared when the user explicitly logs out, or clears
    browser cookies/cache.
    """
    settings = get_settings()
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        httponly=True,                    # JS cannot read this cookie
        secure=settings.cookie_secure,    # True in production (HTTPS only)
        samesite="lax",                   # CSRF protection
        max_age=settings.access_token_expire_minutes * 60,
        path="/",
        domain=settings.cookie_domain or None,
    )


def set_refresh_cookie(response: Response, token: str) -> None:
    """Set an httpOnly secure cookie containing the refresh token.

    The refresh token cookie has a longer lifetime (30 days) and is
    scoped to the /auth path to avoid sending it on every request.
    """
    settings = get_settings()
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=token,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        max_age=REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        path="/",                         # needs to be "/" for proxy forwarding
        domain=settings.cookie_domain or None,
    )


def clear_auth_cookie(response: Response) -> None:
    """Delete both auth cookies (logout)."""
    settings = get_settings()
    response.delete_cookie(
        key=COOKIE_NAME,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        path="/",
        domain=settings.cookie_domain or None,
    )
    response.delete_cookie(
        key=REFRESH_COOKIE_NAME,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        path="/",
        domain=settings.cookie_domain or None,
    )


def get_token_from_cookie(request: Request) -> Optional[str]:
    """Extract the JWT access token from the httpOnly cookie."""
    return request.cookies.get(COOKIE_NAME)


def get_refresh_token_from_cookie(request: Request) -> Optional[str]:
    """Extract the refresh token from the httpOnly cookie."""
    return request.cookies.get(REFRESH_COOKIE_NAME)
