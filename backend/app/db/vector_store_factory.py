"""
Factory: returns the pgvector-backed VectorStore implementation.
Created as a module-level singleton — instantiated once at import time.
"""

from app.config import settings
from app.db.vector_store import VectorStore
from app.utils.logger import logger


def get_vector_store() -> VectorStore:
    """
    Instantiate the vector store backend based on configuration.
    Currently only pgvector is supported.
    """
    backend = settings.vector_store_backend.lower()
    logger.info(f"Initializing vector store backend: {backend}")

    if backend == "pgvector":
        from app.db.pgvector_store import PgVectorStore
        return PgVectorStore()
    else:
        raise ValueError(f"Unknown VECTOR_STORE_BACKEND: '{backend}'. Use 'pgvector'.")


# ── Singleton instance ────────────────────────────────────
vector_store = get_vector_store()
