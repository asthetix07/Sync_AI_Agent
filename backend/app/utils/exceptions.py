"""
Global exception handlers for FastAPI.
Provides consistent JSON error responses and logging.
"""

from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse
from app.utils.logger import logger


async def global_exception_handler(request: Request, exc: Exception):
    """
    Catch-all exception handler — prevents stack traces from leaking to clients.
    Logs the full error server-side for debugging.

    IMPORTANT: Re-raises HTTPException so FastAPI handles status codes properly
    (e.g. 401 from auth, 422 from validation). Only catches truly unhandled errors.
    """
    # Let FastAPI handle its own HTTPExceptions normally (401, 403, 404, 422, etc.)
    if isinstance(exc, HTTPException):
        raise exc

    logger.error(
        f"Unhandled exception on {request.method} {request.url.path}: {exc}",
        exc_info=True,
    )
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server error",
        },
    )
