"""
Embedder — embeds chunked documents and stores them in the vector database.
"""

from langchain_core.documents import Document
from typing import List
from app.db.vector_store_factory import vector_store
from app.utils.logger import logger


def embed_and_store(documents: List[Document], session_id: str) -> int:
    """
    Embed document chunks and store them in the configured vector store.
    Returns the number of chunks stored.
    """
    vector_store.add_documents(documents, session_id)
    logger.info(f"Embedded and stored {len(documents)} chunks for session {session_id[:8]}...")
    return len(documents)
