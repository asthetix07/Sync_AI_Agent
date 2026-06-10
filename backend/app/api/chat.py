"""
Chat API route — POST /chat
Thin route handler — delegates all business logic to the agent.
Now properly async to support concurrent users.
Registers session ownership for user isolation.
"""

from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse
from app.models.chat import ChatRequest
from app.core.agent import chat_stream
from app.core.dependencies import get_current_user
from app.core.rate_limit import limiter
from app.db.postgres import register_session_owner
from app.utils.logger import logger

router = APIRouter(tags=["Chat"])


@router.post("/chat")
@limiter.limit("20/minute")
async def chat_endpoint(
    request: Request,
    body: ChatRequest,
    user: dict = Depends(get_current_user),
):
    """
    Send a message to the chatbot.
    Requires authentication via httpOnly cookie.
    - Registers session ownership on first message (user isolation).
    - If the session has uploaded PDFs, RAG is attempted first.
    - Otherwise, the agent uses smart intent routing (web search vs direct).
    - Streams response chunks to the caller using a StreamingResponse.
    """
    user_id = user.get("sub", "unknown")
    logger.info(
        f"POST /chat — session={body.session_id[:8]}..., "
        f"user={user_id[:8]}..."
    )

    # Register this session as belonging to this user (idempotent)
    register_session_owner(body.session_id, user_id)

    # Returns a stream of text chunks
    return StreamingResponse(
        chat_stream(
            session_id=body.session_id,
            user_message=body.message,
        ),
        media_type="text/event-stream",
    )

