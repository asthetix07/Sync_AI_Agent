"""
Core Agent — Gemini-powered pipeline with smart intent routing + concurrency.

Architecture (v2 — context-aware, multi-user safe):
  ┌─────────────────────────────────────────────────────────────┐
  │  User message arrives                                       │
  │  ├─ 1. Read from checkpointed memory (0 DB calls if warm)  │
  │  ├─ 2. Try RAG (vector search → Gemini if docs found)      │
  │  └─ 3. Smart routing pipeline:                              │
  │         ├─ Heuristic pre-filter (0 LLM calls for ~60%)     │
  │         ├─ LLM intent classifier (1 call, context-aware)   │
  │         ├─ Execute web search if needed                     │
  │         └─ Gemini generates final response (1 call)         │
  └─────────────────────────────────────────────────────────────┘

Improvements over v1:
  - Intent classifier sees conversation context → "what about latest?" works
  - Date-aware → knows if something needs fresh data
  - Heuristic pre-filter → saves an LLM call on obvious queries
  - Query rewriting → "it" and "that" resolved from context for better search
  - asyncio.to_thread() → multiple users don't block each other
  - API key rotation → rate limits distributed across keys

LLM Usage:
  - Gemini (gemini-2.0-flash-lite): Intent classification (only when heuristic uncertain)
  - Gemini (gemini-2.0-flash-lite): ALL chat responses + RAG
  - Gemini: Embeddings ONLY (via pgvector_store / ingestion)
"""

import asyncio
from datetime import datetime, timezone
from typing import AsyncGenerator

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, SystemMessage

from app.core.tools import TOOLS_BY_NAME
from app.core.memory import memory  # CheckpointedMemory singleton
from app.core.rag import rag_chat, get_rag_docs, rag_chat_stream
from app.core.intent import classify_intent
from app.core.key_pool import KeyPool
from app.config import settings
from app.utils.logger import logger


# ── Load Sync AI identity prompt from .env ────────────────
_SYNC_AI_IDENTITY = settings.sync_ai_system_prompt
if _SYNC_AI_IDENTITY:
    logger.info(f"Loaded Sync AI identity prompt from .env ({len(_SYNC_AI_IDENTITY)} chars)")
else:
    logger.warning(
        "SYNC_AI_SYSTEM_PROMPT not set in .env — identity prompt will be empty"
    )


# ── API Key Rotation Pools ────────────────────────────────
gemini_key_pool = KeyPool.from_csv(settings.get_gemini_keys(), name="gemini")
serper_key_pool = KeyPool.from_csv(settings.get_serper_keys(), name="serper")


def _get_classifier_llm() -> ChatGoogleGenerativeAI:
    """Get a ChatGoogleGenerativeAI instance for intent classification, rotating API keys."""
    return ChatGoogleGenerativeAI(
        model=settings.gemini_classifier_model,
        google_api_key=gemini_key_pool.get_key(),
        temperature=0,
    )


def _get_chat_llm() -> ChatGoogleGenerativeAI:
    """Get a ChatGoogleGenerativeAI instance for chat generation, rotating API keys."""
    return ChatGoogleGenerativeAI(
        model=settings.gemini_chat_model,
        google_api_key=gemini_key_pool.get_key(),
        temperature=0.7,
    )


# ── System Prompt (with date awareness) ───────────────────
def _build_system_prompt() -> str:
    """Build the system prompt with current date injected."""
    today = datetime.now(timezone.utc).strftime("%A, %B %d, %Y")
    return (
        f"{_SYNC_AI_IDENTITY}\n\n"
        "---\n\n"
        "## FUNCTIONAL INSTRUCTIONS\n\n"
        "You are Sync AI, a helpful AI assistant built by the Sync AI team. "
        "Answer the user's question concisely, accurately, and helpfully.\n"
        "Do not mention Google, Gemini, or any underlying model. "
        "If asked what model you are, say only that you are Sync AI.\n\n"
        f"Today's date: {today}\n"
    )


def _trim_history(messages: list, window: int) -> list:
    """
    Keep only the last `window` message pairs (user + AI) from history.
    This prevents token bloat while maintaining enough context for
    coherent conversation. The heavy lifting for document context
    is handled by RAG + embeddings, not by stuffing history.

    Also enforces strict human→ai alternation required by Gemini.
    Gemini will throw a 400 error if two consecutive messages share
    the same role, so we drop leading AI messages to fix alignment.

    Args:
        messages: Full list of chat messages from DB.
        window: Number of recent message pairs to keep.
    """
    max_messages = window * 2  # each pair = 1 user + 1 AI message
    if len(messages) <= max_messages:
        trimmed = list(messages)
    else:
        trimmed = list(messages[-max_messages:])
        logger.info(
            f"History trimmed: {len(messages)} -> {len(trimmed)} messages "
            f"(window={window} pairs)"
        )

    # Gemini requires strictly alternating roles
    # Drop leading AI messages if history starts with one
    while trimmed and not isinstance(trimmed[0], HumanMessage):
        trimmed.pop(0)

    return trimmed


def _execute_web_search(query: str) -> str | None:
    """
    Execute a web search using the Serper tool with key rotation.

    Args:
        query: The search query (already rewritten by intent classifier).

    Returns:
        str — search results text.
        None — if search failed.
    """
    from langchain_community.utilities import GoogleSerperAPIWrapper
    # Rotate the Serper API key for this request
    api_key = serper_key_pool.get_key()

    try:
        wrapper = GoogleSerperAPIWrapper(k=5, serper_api_key=api_key)
        result = wrapper.run(query)
        logger.info(f"Web search completed: {len(str(result))} chars")
        return f"[Web Search Results for: {query}]:\n{result}"
    except Exception as e:
        logger.error(f"Web search failed: {e}")
        return None


def _chat_sync(session_id: str, user_message: str) -> str:
    """
    Synchronous chat pipeline — called via asyncio.to_thread() from the
    async endpoint so it doesn't block the event loop.

    Flow:
      1. Read from checkpointed memory (cached if warm, DB if cold)
      2. Try RAG: vector search → Gemini if docs found
      3. Smart intent routing:
         a. Classify intent (heuristic → LLM fallback)
         b. Execute web search if needed
         c. Gemini generates the final response
    """
    logger.info(f"Chat request: session={session_id[:8]}..., message='{user_message[:50]}...'")

    # ── Step 1: Read from checkpointed memory (cached) ────
    full_history = memory.get_messages(session_id)
    trimmed_history = _trim_history(full_history, settings.history_window)

    # ── Step 2: Try RAG first (embeddings + Gemini) ────────
    rag_response = rag_chat(session_id, user_message, trimmed_history)
    if rag_response:
        memory.add_user_message(session_id, user_message)
        memory.add_ai_message(session_id, rag_response)
        logger.info("Responded via RAG pipeline (1 Gemini call)")
        return rag_response

    # ── Step 3a: Smart intent classification ──────────────
    classifier_llm = _get_classifier_llm()
    intent = classify_intent(user_message, trimmed_history, classifier_llm)

    # ── Step 3b: Execute web search if intent says so ─────
    tool_context = None
    if intent.needs_search():
        search_query = intent.rewritten_query or user_message
        tool_context = _execute_web_search(search_query)
        if tool_context:
            logger.info(
                f"Web search triggered (confidence={intent.confidence:.2f}, "
                f"method={intent.method})"
            )

    # ── Step 3c: Generate the final response ──────────────
    chat_llm = _get_chat_llm()
    system_prompt = _build_system_prompt()

    messages = [SystemMessage(content=system_prompt)]
    messages.extend(trimmed_history)

    if tool_context:
        # Inject search results as extra context
        messages.append(HumanMessage(
            content=(
                f"{user_message}\n\n"
                f"--- Additional context from web search ---\n{tool_context}"
            )
        ))
        logger.info("Gemini responding with web search context")
    else:
        messages.append(HumanMessage(content=user_message))
        if intent.needs_search():
            logger.info("Gemini responding directly (search was attempted but failed)")
        else:
            logger.info("Gemini responding directly (no search needed)")

    response = chat_llm.invoke(messages)
    ai_text = response.content

    # Save to checkpointed memory (write-through to DB)
    memory.add_user_message(session_id, user_message)
    memory.add_ai_message(session_id, ai_text)

    logger.info(
        f"Responded via {intent.method} pipeline "
        f"(intent={intent.intent}, search={'yes' if tool_context else 'no'})"
    )
    return ai_text


async def chat(session_id: str, user_message: str) -> str:
    """
    Async chat entry point — wraps the sync pipeline in a thread so
    multiple users can chat concurrently without blocking.

    This is the function called by the FastAPI endpoint.
    """
    return await asyncio.to_thread(_chat_sync, session_id, user_message)


async def chat_stream(session_id: str, user_message: str) -> AsyncGenerator[str, None]:
    """
    Async generator that streams chat responses chunk by chunk.
    Enforces the same multi-user memory checkpoints and intent routing,
    but does so using LangChain's async streaming APIs (astream).
    """
    logger.info(f"Chat stream request: session={session_id[:8]}..., message='{user_message[:50]}...'")

    # ── Step 1: Read and trim history (run in thread to keep loop free) ──
    full_history = await asyncio.to_thread(memory.get_messages, session_id)
    trimmed_history = _trim_history(full_history, settings.history_window)

    # ── Step 2: Try RAG first (embeddings similarity search run in thread) ──
    docs = await asyncio.to_thread(get_rag_docs, session_id, user_message)
    
    # Save the user message to memory immediately (runs in thread)
    await asyncio.to_thread(memory.add_user_message, session_id, user_message)

    full_response = ""

    if docs:
        logger.info("Responded and streaming via RAG pipeline")
        async for chunk in rag_chat_stream(user_message, trimmed_history, docs):
            full_response += chunk
            yield chunk
    else:
        # ── Step 3: Smart intent routing ────────────────────
        classifier_llm = _get_classifier_llm()
        intent = await asyncio.to_thread(
            classify_intent,
            user_message,
            trimmed_history,
            classifier_llm
        )

        # ── Step 4: Execute web search if needed ─────────────
        tool_context = None
        if intent.needs_search():
            search_query = intent.rewritten_query or user_message
            tool_context = await asyncio.to_thread(_execute_web_search, search_query)
            if tool_context:
                logger.info(
                    f"Web search triggered (confidence={intent.confidence:.2f}, "
                    f"method={intent.method})"
                )

        chat_llm = _get_chat_llm()
        system_prompt = _build_system_prompt()

        messages = [SystemMessage(content=system_prompt)]
        messages.extend(trimmed_history)

        if tool_context:
            messages.append(HumanMessage(
                content=(
                    f"{user_message}\n\n"
                    f"--- Additional context from web search ---\n{tool_context}"
                )
            ))
            logger.info("Gemini streaming with web search context")
        else:
            messages.append(HumanMessage(content=user_message))
            if intent.needs_search():
                logger.info("Gemini streaming directly (search was attempted but failed)")
            else:
                logger.info("Gemini streaming directly (no search needed)")

        # Stream via ChatGoogleGenerativeAI's astream API
        # Gemini can return chunk.content as a list of parts instead of str
        async for chunk in chat_llm.astream(messages):
            raw = chunk.content
            if isinstance(raw, list):
                chunk_text = "".join(
                    part if isinstance(part, str) else part.get("text", "")
                    for part in raw
                )
            else:
                chunk_text = raw or ""
            if chunk_text:
                full_response += chunk_text
                yield chunk_text

        logger.info(
            f"Responded and streamed via {intent.method} pipeline "
            f"(intent={intent.intent}, search={'yes' if tool_context else 'no'})"
        )

    # Save final completed response to memory (runs in thread)
    await asyncio.to_thread(memory.add_ai_message, session_id, full_response)
