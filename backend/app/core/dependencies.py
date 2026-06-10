"""
FastAPI dependencies for authentication and authorization.

Usage in any route:
    @router.get("/protected")
    async def protected(user=Depends(get_current_user)):
        ...
"""

from fastapi import Depends, HTTPException, Request, status

from app.core.security import get_token_from_cookie, verify_access_token
from app.utils.logger import logger


async def get_current_user(request: Request) -> dict:
    """
    Dependency that extracts and verifies the JWT from the httpOnly cookie.

    Returns:
        dict with at least {"sub": "<user_openid>", ...} from the JWT payload.

    Raises:
        HTTPException 401 if no cookie or invalid/expired token.
    """
    token = get_token_from_cookie(request)
    if not token:
        logger.warning(
            f"Auth failed: no access_token cookie on {request.method} {request.url.path}"
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    payload = verify_access_token(token)  # raises 401 on failure
    return payload
