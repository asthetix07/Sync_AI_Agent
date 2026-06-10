"""
pgvector implementation of the VectorStore interface.
Uses the Gemini batchEmbedContents REST API for ALL embedding calls
(both document ingestion and similarity search queries) with key rotation.

Architecture:
  ┌──────────────────────────────────────────────────────────────┐
  │  NoOpEmbeddings                                              │
  │  └─ Implements LangChain Embeddings interface                │
  │  └─ Returns zero-vectors — never calls any external API      │
  │  └─ Passed to PGVector so it skips dimensionality probing    │
  │                                                              │
  │  _batch_embed(texts)                                         │
  │  └─ KeyPool.get_key() → rotates across N Gemini API keys     │
  │  └─ REST API: batchEmbedContents (up to 100 texts/call)      │
  │                                                              │
  │  add_documents  → _batch_embed → store.add_embeddings        │
  │  similarity_search → _batch_embed → similarity_search_by_vector │
  │                                                              │
  │  Result: ZERO hidden LangChain embedding calls.              │
  └──────────────────────────────────────────────────────────────┘
"""

from langchain_postgres import PGVector
from langchain_core.embeddings import Embeddings
from langchain_core.documents import Document
import httpx
from typing import List

from app.db.vector_store import VectorStore
from app.core.key_pool import KeyPool
from app.config import settings
from app.utils.logger import logger

# ── Batch size for the Gemini batchEmbedContents API ──────────────────
# The API accepts up to 100 EmbedContentRequest objects per batch call.
_EMBED_BATCH_SIZE = 100

_BATCH_EMBED_URL = (
    "https://generativelanguage.googleapis.com/v1beta"
    "/models/{model}:batchEmbedContents"
)

_EMBEDDING_DIM = 768


class _NoOpEmbeddings(Embeddings):
    """Dummy embeddings that satisfy the LangChain PGVector constructor.

    PGVector requires an Embeddings object at init time and may call
    embed_query() internally to detect vector dimensionality.  This stub
    returns zero-vectors of the correct dimension so that:
      • PGVector.__init__() completes without any external API call
      • No real Gemini API quota is consumed on server startup / reload
    """

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        return [[0.0] * _EMBEDDING_DIM for _ in texts]

    def embed_query(self, text: str) -> List[float]:
        return [0.0] * _EMBEDDING_DIM


# ── Gemini embedding key pool (rotates across GEMINI_API_KEYS) ────────
_gemini_key_pool = KeyPool.from_csv(settings.get_gemini_keys(), name="gemini_embed")


class PgVectorStore(VectorStore):
    """pgvector-backed vector store with key-rotated Gemini embeddings."""

    def __init__(self):
        self.store = PGVector(
            embeddings=_NoOpEmbeddings(),
            collection_name="documents",
            connection=settings.postgre_url,
        )
        logger.info("PgVectorStore initialized (collection='documents')")

    # ── Batch embedding via REST API with key rotation ────────────────

    def _batch_embed(self, texts: List[str]) -> List[List[float]]:
        """Embed texts via the Gemini batchEmbedContents REST API.

        Uses KeyPool round-robin rotation so concurrent users spread
        across all configured Gemini API keys.  Up to 100 texts per
        API call.
        """
        all_embeddings: List[List[float]] = []
        model_name = settings.embedding_model
        url = _BATCH_EMBED_URL.format(model=model_name)

        for start in range(0, len(texts), _EMBED_BATCH_SIZE):
            batch = texts[start : start + _EMBED_BATCH_SIZE]

            # Rotate to the next API key for this call
            api_key = _gemini_key_pool.get_key()

            body = {
                "requests": [
                    {
                        "model": f"models/{model_name}",
                        "content": {"parts": [{"text": t}]},
                        "taskType": "RETRIEVAL_DOCUMENT",
                        "outputDimensionality": _EMBEDDING_DIM,
                    }
                    for t in batch
                ]
            }

            resp = httpx.post(
                url,
                params={"key": api_key},
                json=body,
                timeout=120.0,
            )
            resp.raise_for_status()
            data = resp.json()

            for emb in data["embeddings"]:
                all_embeddings.append(emb["values"])

        return all_embeddings

    # ── Document ingestion ────────────────────────────────────────────

    def add_documents(self, documents: List[Document], session_id: str) -> None:
        """Store documents with session_id metadata for per-session filtering.

        Works around upstream bugs in langchain-google-genai and
        langchain-postgres by:
          1. Embedding via the Gemini REST API directly (key-rotated)
          2. Inserting rows one at a time (avoids psycopg2 batch bug)
        """
        for doc in documents:
            doc.metadata["session_id"] = session_id

        texts = [doc.page_content for doc in documents]
        metadatas = [doc.metadata for doc in documents]

        # ── Step 1: batch-embed via REST API ──────────────────────────
        embeddings = self._batch_embed(texts)
        logger.info(
            f"Computed {len(embeddings)} embeddings in "
            f"{(len(texts) - 1) // _EMBED_BATCH_SIZE + 1} API call(s) "
            f"for session {session_id[:8]}..."
        )

        # ── Step 2: try batch insertion, fall back to single-row on error ───
        try:
            self.store.add_embeddings(
                texts=texts,
                embeddings=embeddings,
                metadatas=metadatas,
            )
            stored = len(texts)
        except Exception as e:
            logger.warning(
                f"Batch insert failed, falling back to single-row inserts. Error: {e}"
            )
            stored = 0
            for text, embedding, metadata in zip(texts, embeddings, metadatas):
                self.store.add_embeddings(
                    texts=[text],
                    embeddings=[embedding],
                    metadatas=[metadata],
                )
                stored += 1

        logger.info(f"Stored {stored}/{len(documents)} chunks for session {session_id[:8]}...")

    # ── Similarity search (query embedding via REST + key rotation) ───

    def similarity_search(self, query: str, session_id: str, k: int = 4) -> List[Document]:
        """Retrieve top-k similar documents filtered to the given session.

        Embeds the query via _batch_embed() (key-rotated REST API),
        then uses similarity_search_by_vector() to avoid any internal
        LangChain embed_query() call.
        """
        # Embed query through our key-rotated batch API
        query_embedding = self._batch_embed([query])[0]

        results = self.store.similarity_search_by_vector(
            embedding=query_embedding,
            k=k,
            filter={"session_id": session_id},
        )
        logger.info(
            f"Similarity search returned {len(results)} results "
            f"for session {session_id[:8]}..."
        )
        return results

    def delete_by_session(self, session_id: str) -> None:
        """Delete all documents belonging to a session."""
        self.store.delete(filter={"session_id": session_id})
        logger.info(f"Deleted all vectors for session {session_id[:8]}...")
