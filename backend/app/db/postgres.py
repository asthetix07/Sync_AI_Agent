"""
PostgreSQL session & ORM models for chat history.
Uses the PG_URL (separate postgres instance for threads/history).

User isolation: ChatSession now includes user_id to scope sessions
per user. Each user can only see/delete their own sessions.
"""

from sqlalchemy import create_engine, Column, String, Text, DateTime, func
from sqlalchemy.orm import declarative_base, sessionmaker
from app.config import settings
from app.utils.logger import logger

# ── Engine & session factory ──────────────────────────────
engine = create_engine(
    settings.pg_url,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
    pool_recycle=1800,    # recycle connections every 30 min (prevents stale)
    pool_timeout=30,      # fail fast if pool exhausted (instead of hanging)
)
SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()


# ── ORM Models ────────────────────────────────────────────
class ChatSession(Base):
    """
    Tracks unique chat sessions WITH user ownership.
    This is the user isolation layer — each session is tied to a user_id.
    """
    __tablename__ = "chat_sessions"

    session_id = Column(String, primary_key=True)
    user_id = Column(String, index=True, nullable=True)  # owner's openid from JWT
    title = Column(String, default="New Chat")
    created_at = Column(DateTime, server_default=func.now())


class Message(Base):
    """Individual messages within a chat session."""
    __tablename__ = "messages"

    id = Column(String, primary_key=True)
    session_id = Column(String, index=True)
    role = Column(String)           # "human" or "ai"
    content = Column(Text)
    created_at = Column(DateTime, server_default=func.now())


class UserDataSyncAi(Base):
    """Google OAuth user profile data."""
    __tablename__ = "user_data_sync_ai"

    openid = Column(String, primary_key=True)
    name = Column(String, nullable=True)
    email = Column(String, nullable=False, index=True)
    profile_url = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


def upsert_user_data(
    *,
    openid: str,
    name: str | None,
    email: str,
    profile_url: str | None,
) -> dict[str, str | None | bool]:
    """Insert or update a Google OAuth user row.

    Returns a dict with user data plus `is_new_user` (True on first signup).
    """
    with SessionLocal() as db:
        user = db.get(UserDataSyncAi, openid)
        is_new_user = user is None

        if is_new_user:
            user = UserDataSyncAi(
                openid=openid,
                name=name,
                email=email,
                profile_url=profile_url,
            )
            db.add(user)
        else:
            user.name = name
            user.email = email
            user.profile_url = profile_url

        db.commit()
        return {
            "openid": user.openid,
            "name": user.name,
            "email": user.email,
            "profile_url": user.profile_url,
            "is_new_user": is_new_user,
        }


# ── Session ownership helpers ─────────────────────────────

def register_session_owner(session_id: str, user_id: str) -> None:
    """
    Register a session as belonging to a user.
    Called on first message in a session to establish ownership.
    If the session already exists, this is a no-op (doesn't change owner).
    """
    with SessionLocal() as db:
        existing = db.get(ChatSession, session_id)
        if existing is None:
            session = ChatSession(session_id=session_id, user_id=user_id)
            db.add(session)
            db.commit()
            logger.info(f"Registered session {session_id[:8]}... owned by user {user_id[:8]}...")
        elif existing.user_id is None:
            # Backfill: session exists but has no owner (legacy data)
            existing.user_id = user_id
            db.commit()
            logger.info(f"Backfilled owner for session {session_id[:8]}... → user {user_id[:8]}...")


def get_user_sessions(user_id: str) -> list[dict]:
    """
    Get all session_ids owned by a specific user, with message counts
    from the langchain_chat_history table.
    """
    with SessionLocal() as db:
        from sqlalchemy import text
        # Join chat_sessions (for ownership) with langchain_chat_history (for message count)
        result = db.execute(text(
            """
            SELECT cs.session_id, COUNT(lch.id) as msg_count
            FROM chat_sessions cs
            LEFT JOIN langchain_chat_history lch ON cs.session_id = lch.session_id::text
            WHERE cs.user_id = :user_id
            GROUP BY cs.session_id
            ORDER BY cs.created_at DESC
            """
        ), {"user_id": user_id})
        return [
            {"session_id": str(row[0]), "message_count": row[1]}
            for row in result.fetchall()
        ]


def verify_session_owner(session_id: str, user_id: str) -> bool:
    """
    Check if a session belongs to a specific user.
    Returns True if the user owns the session, or if the session has no owner
    (legacy data — allows backward compatibility).
    """
    with SessionLocal() as db:
        session = db.get(ChatSession, session_id)
        if session is None:
            # Session not registered — allow (legacy behavior)
            return True
        if session.user_id is None:
            # No owner set — allow (legacy data)
            return True
        return session.user_id == user_id


def delete_session_record(session_id: str) -> None:
    """Delete the ChatSession ownership record."""
    with SessionLocal() as db:
        session = db.get(ChatSession, session_id)
        if session:
            db.delete(session)
            db.commit()


def delete_session_all_tables(session_id: str) -> dict[str, int]:
    """
    Comprehensive deletion: remove ALL data for a session from every table.

    Cleans up:
      1. chat_sessions          — ownership record
      2. messages                — ORM message rows (if any)
      3. langchain_chat_history  — LangChain chat history rows
      4. langchain_pg_embedding  — vector embeddings tagged with this session

    Returns a dict mapping table name → number of rows deleted (for logging).
    """
    from sqlalchemy import text

    deleted: dict[str, int] = {}

    with SessionLocal() as db:
        # 1. chat_sessions
        r = db.execute(
            text("DELETE FROM chat_sessions WHERE session_id = :sid"),
            {"sid": session_id},
        )
        deleted["chat_sessions"] = r.rowcount

        # 2. messages (ORM-managed table, may have legacy data)
        r = db.execute(
            text("DELETE FROM messages WHERE session_id = :sid"),
            {"sid": session_id},
        )
        deleted["messages"] = r.rowcount

        # 3. langchain_chat_history
        r = db.execute(
            text("DELETE FROM langchain_chat_history WHERE session_id = :sid"),
            {"sid": session_id},
        )
        deleted["langchain_chat_history"] = r.rowcount

        db.commit()

    # 4. langchain_pg_embedding (lives in the vector DB, may be same or different)
    #    Embeddings store session_id inside the JSONB `cmetadata` column.
    #    We find the collection UUID for "documents", then delete matching rows.
    try:
        from app.config import settings as _cfg
        from sqlalchemy import create_engine as _ce

        vec_engine = _ce(_cfg.postgre_url, pool_pre_ping=True)
        with vec_engine.connect() as conn:
            # Find the collection uuid for "documents"
            coll = conn.execute(
                text(
                    "SELECT uuid FROM langchain_pg_collection "
                    "WHERE name = 'documents' LIMIT 1"
                )
            ).fetchone()

            if coll:
                coll_uuid = coll[0]
                r = conn.execute(
                    text(
                        "DELETE FROM langchain_pg_embedding "
                        "WHERE collection_id = :cid "
                        "AND cmetadata ->> 'session_id' = :sid"
                    ),
                    {"cid": coll_uuid, "sid": session_id},
                )
                deleted["langchain_pg_embedding"] = r.rowcount
            else:
                deleted["langchain_pg_embedding"] = 0

            conn.commit()
        vec_engine.dispose()
    except Exception as e:
        logger.warning(f"Could not clean langchain_pg_embedding for {session_id[:8]}...: {e}")
        deleted["langchain_pg_embedding"] = -1  # flag as error

    return deleted


# ── Table creation helper ─────────────────────────────────
def create_tables():
    """Create all ORM-managed tables if they don't exist."""
    Base.metadata.create_all(bind=engine)
