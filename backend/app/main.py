"""
FastAPI Application Entry Point.
Registers all routers, middleware, and startup/shutdown events.
"""

import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager

from app.api import chat, upload, session
from app.config import settings
from app.db.postgres import create_tables
from app.utils.exceptions import global_exception_handler
from app.utils.logger import logger
from auth import oauth

# ── Rate Limiting ─────────────────────────────────────────
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.core.rate_limit import limiter


# ── Lifespan handler (modern replacement for on_event) ────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown logic."""
    # ── STARTUP ───────────────────────────────────────────
    logger.info("🚀 Starting Chatbot API...")
    create_tables()
    logger.info("✅ Database tables verified/created")
    logger.info("✅ Chatbot API is ready")
    yield
    # ── SHUTDOWN ──────────────────────────────────────────
    logger.info("🛑 Shutting down Chatbot API...")
    try:
        from app.core.memory import pool as chat_pool
        chat_pool.close()
        logger.info("✅ Chat history connection pool closed")
    except Exception as e:
        logger.warning(f"Error closing chat history connection pool: {e}")
    try:
        from app.db.postgres import engine
        engine.dispose()
        logger.info("✅ SQLAlchemy database engine disposed")
    except Exception as e:
        logger.warning(f"Error disposing SQLAlchemy engine: {e}")


# ── App instance ──────────────────────────────────────────
app = FastAPI(
    title="Chatbot API",
    description=(
        "Conversational AI chatbot with persistent memory, PDF ingestion, "
        "RAG, web search, and tool calling."
    ),
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs" if settings.cookie_secure is False else None,  # disable Swagger in prod
    redoc_url="/redoc" if settings.cookie_secure is False else None,
)

# ── Attach limiter to app state ──────────────────────────
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


# ── Security Headers Middleware ──────────────────────────
class SecurityHeadersMiddleware:
    """ASGI middleware to add security response headers and remove server info."""
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        async def send_with_headers(message):
            if message["type"] == "http.response.start":
                # Filter out "server" header if present to avoid leaking server identity
                headers = [
                    (k, v) for k, v in message.get("headers", [])
                    if k.lower() != b"server"
                ]
                extra = [
                    (b"x-content-type-options", b"nosniff"),
                    (b"x-frame-options", b"DENY"),
                    (b"strict-transport-security", b"max-age=31536000; includeSubDomains"),
                    (b"referrer-policy", b"strict-origin-when-cross-origin"),
                    (b"permissions-policy", b"camera=(), microphone=(), geolocation=()"),
                ]
                message["headers"] = headers + extra
            await send(message)

        await self.app(scope, receive, send_with_headers)


app.add_middleware(SecurityHeadersMiddleware)

# ── CORS Middleware ───────────────────────────────────────
# LOCKED to explicit origins — never use ["*"] with allow_credentials=True
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.backend_cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


# ── Request Size Limiter (DoS protection) ────────────────
@app.middleware("http")
async def limit_request_size(request: Request, call_next):
    """Reject requests larger than 10 MB to prevent DoS via oversized payloads."""
    max_size = 10 * 1024 * 1024  # 10 MB
    content_length = request.headers.get("content-length")
    if content_length and int(content_length) > max_size:
        return JSONResponse(
            status_code=413,
            content={"detail": "Request too large"},
        )
    return await call_next(request)


# ── Global exception handler ─────────────────────────────
app.add_exception_handler(Exception, global_exception_handler)

# ── Register routers ─────────────────────────────────────
app.include_router(chat.router)
app.include_router(upload.router)
app.include_router(session.router)
app.include_router(oauth.router)


# ── Health check ──────────────────────────────────────────
@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "chatbot-api"}
