"""
Conversation memory with in-process LRU checkpointing — THREAD-SAFE.

Architecture:
  ┌───────────────────────────────────────────────────────────┐
  │  _SessionCache (per-session checkpoint)                   │
  │  ├─ messages: list[BaseMessage]   ← cached in RAM         │
  │  ├─ pg_history: PostgresChatMessageHistory                │
  │  └─ last_access: float           ← for TTL eviction       │
  └───────────────────────────────────────────────────────────┘

  ┌───────────────────────────────────────────────────────────┐
  │  CheckpointedMemory (global singleton — thread-safe)      │
  │  ├─ _cache: OrderedDict[session_id → _SessionCache]      │
  │  ├─ _lock: threading.Lock    ← protects all cache ops     │
  │  ├─ Reads: served from cache (0 DB calls if warm)        │
  │  └─ Writes: append to cache + write-through to DB        │
  └───────────────────────────────────────────────────────────┘

Multi-user safety:
  - All cache operations are protected by a threading.Lock
  - Each user's session is independently cached
  - DB remains the durable source of truth
  - Connection pool handles concurrent DB access
"""

import time
import threading
from collections import OrderedDict
from dataclasses import dataclass, field
from typing import List

import psycopg
from psycopg_pool import ConnectionPool
from langchain_postgres import PostgresChatMessageHistory
from langchain_core.chat_history import BaseChatMessageHistory
from langchain_core.messages import BaseMessage

from app.config import settings
from app.utils.logger import logger

TABLE_NAME = "langchain_chat_history"

# ── Shared connection pool (bounded, thread-safe) ─────────
# Increased max_size for concurrent users (was 10, now 20)
pool = ConnectionPool(
    conninfo=settings.pg_url,
    min_size=2,
    max_size=20,
    kwargs={"autocommit": True},
)
logger.info("Chat-history connection pool created (min=2, max=20)")

# ── Auto-create the chat history table at startup ─────────
with pool.connection() as _init_conn:
    PostgresChatMessageHistory.create_tables(_init_conn, TABLE_NAME)
logger.info(f"Chat history table '{TABLE_NAME}' ensured.")


# ── Custom Chat Message History managing pool connections ───
class PoolPostgresChatMessageHistory(BaseChatMessageHistory):
    """
    Postgres Chat Message History wrapper that borrows a connection from the pool
    only during individual database queries. This prevents holding long-lived DB
    connections in the memory cache.
    """
    def __init__(self, table_name: str, session_id: str, pool: ConnectionPool):
        self.table_name = table_name
        self.session_id = session_id
        self.pool = pool

    @property
    def messages(self) -> List[BaseMessage]:
        with self.pool.connection() as conn:
            history = PostgresChatMessageHistory(
                self.table_name,
                self.session_id,
                sync_connection=conn,
            )
            return list(history.messages)

    def add_messages(self, messages: List[BaseMessage]) -> None:
        with self.pool.connection() as conn:
            history = PostgresChatMessageHistory(
                self.table_name,
                self.session_id,
                sync_connection=conn,
            )
            history.add_messages(messages)

    def clear(self) -> None:
        with self.pool.connection() as conn:
            history = PostgresChatMessageHistory(
                self.table_name,
                self.session_id,
                sync_connection=conn,
            )
            history.clear()


# ── Per-session cache entry ───────────────────────────────
@dataclass
class _SessionCache:
    """Holds cached messages + the underlying PG history handle."""
    pg_history: PoolPostgresChatMessageHistory
    messages: List[BaseMessage] = field(default_factory=list)
    last_access: float = field(default_factory=time.time)
    _loaded: bool = False

    def load_if_needed(self) -> List[BaseMessage]:
        """Load messages from DB on first access (cold cache)."""
        if not self._loaded:
            self.messages = list(self.pg_history.messages)
            self._loaded = True
            self.last_access = time.time()
            logger.info(
                f"Cold cache: loaded {len(self.messages)} messages from DB"
            )
        return self.messages

    def is_expired(self, ttl: int) -> bool:
        """Check if this cache entry has exceeded its TTL."""
        return (time.time() - self.last_access) > ttl


class CheckpointedMemory:
    """
    In-process LRU memory cache over PostgresChatMessageHistory.
    Thread-safe for concurrent multi-user access.

    - Reads are served from an OrderedDict cache (O(1) lookup).
    - Writes go to both cache and DB (write-through).
    - Stale sessions are evicted by TTL or LRU overflow.
    - DB is always the source of truth for disaster recovery.
    - All operations are protected by a threading.Lock.
    """

    def __init__(
        self,
        max_sessions: int = settings.memory_cache_max_sessions,
        ttl_seconds: int = settings.memory_cache_ttl,
    ):
        self._cache: OrderedDict[str, _SessionCache] = OrderedDict()
        self._max_sessions = max_sessions
        self._ttl = ttl_seconds
        self._lock = threading.Lock()
        logger.info(
            f"CheckpointedMemory initialized "
            f"(max_sessions={max_sessions}, ttl={ttl_seconds}s, thread_safe=True)"
        )

    def _evict_if_needed(self) -> None:
        """Remove oldest sessions when cache is full. Must be called under lock."""
        while len(self._cache) > self._max_sessions:
            evicted_id, evicted = self._cache.popitem(last=False)
            logger.info(f"LRU evicted session {evicted_id[:8]}...")

    def _get_or_create(self, session_id: str) -> _SessionCache:
        """Get a cached session or create a new one from DB. Must be called under lock."""
        if session_id in self._cache:
            entry = self._cache[session_id]
            # Check TTL — if expired, reload from DB
            if entry.is_expired(self._ttl):
                logger.info(f"TTL expired for session {session_id[:8]}... — reloading")
                entry._loaded = False
                entry.load_if_needed()
            # Move to end of OrderedDict (most recently used)
            self._cache.move_to_end(session_id)
            entry.last_access = time.time()
            return entry

        # Cache miss: create new entry from DB
        logger.info(f"Cache miss for session {session_id[:8]}... — loading from DB")
        pg_history = PoolPostgresChatMessageHistory(
            TABLE_NAME,
            session_id,
            pool,
        )
        entry = _SessionCache(pg_history=pg_history)
        self._cache[session_id] = entry
        self._evict_if_needed()
        return entry

    def get_messages(self, session_id: str) -> List[BaseMessage]:
        """
        Get all messages for a session (from cache if warm).
        This is the hot path — avoids DB reads in active conversations.
        Thread-safe.
        """
        with self._lock:
            entry = self._get_or_create(session_id)
            return list(entry.load_if_needed())  # return a copy for safety

    def add_user_message(self, session_id: str, content: str) -> None:
        """Write-through: append to cache + persist to DB. Thread-safe."""
        with self._lock:
            entry = self._get_or_create(session_id)
            entry.load_if_needed()
            entry.pg_history.add_user_message(content)
            # Refresh cache from the pg_history to stay in sync
            entry.messages = list(entry.pg_history.messages)
            entry.last_access = time.time()

    def add_ai_message(self, session_id: str, content: str) -> None:
        """Write-through: append to cache + persist to DB. Thread-safe."""
        with self._lock:
            entry = self._get_or_create(session_id)
            entry.load_if_needed()
            entry.pg_history.add_ai_message(content)
            # Refresh cache from the pg_history to stay in sync
            entry.messages = list(entry.pg_history.messages)
            entry.last_access = time.time()

    def clear_session(self, session_id: str) -> None:
        """Clear a session from both cache and DB. Thread-safe."""
        with self._lock:
            if session_id in self._cache:
                entry = self._cache.pop(session_id)
                entry.pg_history.clear()
                logger.info(f"Cleared session {session_id[:8]}... from cache + DB")
            else:
                # Not in cache — clear directly from DB
                pg_history = PoolPostgresChatMessageHistory(
                    TABLE_NAME,
                    session_id,
                    pool,
                )
                pg_history.clear()
                logger.info(f"Cleared session {session_id[:8]}... from DB (was not cached)")

    def get_pg_history(self, session_id: str) -> BaseChatMessageHistory:
        """
        Get the raw PostgresChatMessageHistory (wrapped in PoolPostgresChatMessageHistory) for a session.
        Used by session API for direct operations. Thread-safe.
        """
        with self._lock:
            entry = self._get_or_create(session_id)
            return entry.pg_history


# ── Module-level singleton ────────────────────────────────
memory = CheckpointedMemory()


def get_session_history(session_id: str) -> BaseChatMessageHistory:
    """
    Backward-compatible accessor — returns the raw PG history handle.
    Used by session.py and anywhere that needs the BaseChatMessageHistory interface.
    """
    return memory.get_pg_history(session_id)
