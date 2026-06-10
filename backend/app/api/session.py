"""
Session API routes — GET/DELETE /sessions
Manage chat sessions and their history.

User isolation: All operations are scoped by user_id from JWT.
Each user can only see, read, and delete their own sessions.
"""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request
from app.core.memory import get_session_history, memory, pool, TABLE_NAME
from app.core.dependencies import get_current_user
from app.core.rate_limit import limiter
from app.db.postgres import (
    get_user_sessions,
    verify_session_owner,
    delete_session_record,
    delete_session_all_tables,
)
from app.utils.logger import logger
from pydantic import BaseModel
from typing import List

router = APIRouter(tags=["Sessions"])


# ── Validation helper ─────────────────────────────────────
def _validate_session_uuid(session_id: str) -> None:
    """Raise 422 if session_id is not a valid UUID."""
    try:
        UUID(session_id)
    except ValueError:
        raise HTTPException(
            status_code=422,
            detail=f"session_id must be a valid UUID, got: '{session_id}'",
        )


class MessageOut(BaseModel):
    role: str
    content: str


class SessionHistoryResponse(BaseModel):
    session_id: str
    messages: List[MessageOut]


class SessionSummary(BaseModel):
    session_id: str
    message_count: int


@router.get("/sessions", response_model=List[SessionSummary])
@limiter.limit("30/minute")
async def list_sessions(request: Request, user: dict = Depends(get_current_user)):
    """
    List sessions owned by the current user with their message counts.
    Requires authentication via httpOnly cookie.
    User isolation: only returns sessions belonging to this user.
    """
    user_id = user.get("sub", "unknown")
    logger.info(f"GET /sessions — user={user_id[:8]}...")

    sessions = get_user_sessions(user_id)
    return [
        SessionSummary(session_id=s["session_id"], message_count=s["message_count"])
        for s in sessions
    ]


@router.get("/sessions/{session_id}", response_model=SessionHistoryResponse)
@limiter.limit("30/minute")
async def get_session(request: Request, session_id: str, user: dict = Depends(get_current_user)):
    """
    Retrieve the full chat history for a given session.
    User isolation: only the session owner can read it.
    """
    _validate_session_uuid(session_id)
    user_id = user.get("sub", "unknown")
    logger.info(f"GET /sessions/{session_id[:8]}... — user={user_id[:8]}...")

    # ── Ownership check ──────────────────────────────────
    if not verify_session_owner(session_id, user_id):
        logger.warning(
            f"Access denied: user {user_id[:8]}... tried to read "
            f"session {session_id[:8]}... owned by another user"
        )
        raise HTTPException(
            status_code=403,
            detail="You do not have access to this session",
        )

    history = get_session_history(session_id)
    messages = [
        MessageOut(
            role=msg.type,  # "human" or "ai"
            content=msg.content,
        )
        for msg in history.messages
    ]
    return SessionHistoryResponse(session_id=session_id, messages=messages)


@router.delete("/sessions/{session_id}")
@limiter.limit("10/minute")
async def delete_session(request: Request, session_id: str, user: dict = Depends(get_current_user)):
    """
    Clear all memory and uploaded documents for a session.
    User isolation: only the session owner can delete it.
    - Clears chat history from both the in-memory cache and PostgreSQL
    - Deletes all vector embeddings for this session
    - Removes the session ownership record
    """
    _validate_session_uuid(session_id)
    user_id = user.get("sub", "unknown")
    logger.info(f"DELETE /sessions/{session_id[:8]}... — user={user_id[:8]}...")

    # ── Ownership check ──────────────────────────────────
    if not verify_session_owner(session_id, user_id):
        logger.warning(
            f"Access denied: user {user_id[:8]}... tried to delete "
            f"session {session_id[:8]}... owned by another user"
        )
        raise HTTPException(
            status_code=403,
            detail="You do not have access to this session",
        )

    # Clear in-memory cache (does NOT touch DB — that's handled below)
    try:
        memory.clear_session(session_id)
    except Exception as e:
        logger.warning(f"Could not clear in-memory cache for {session_id[:8]}...: {e}")

    # Comprehensive DB cleanup: chat_sessions, messages,
    # langchain_chat_history, langchain_pg_embedding
    try:
        deleted = delete_session_all_tables(session_id)
        logger.info(
            f"Session {session_id[:8]}... deleted — "
            f"rows removed: {deleted}"
        )
    except Exception as e:
        logger.error(f"Error during comprehensive delete for {session_id[:8]}...: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to delete session data",
        )

    return {
        "detail": f"Session {session_id} deleted successfully.",
        "deleted_rows": deleted,
    }
