"""
Tests for the PDF ingestion pipeline.
"""

from app.ingestion.chunker import chunk_documents
from langchain_core.documents import Document


def test_chunker_splits_large_document():
    """Verify that a large document gets split into multiple chunks."""
    # Create a document larger than chunk_size (500 chars)
    large_text = "This is a test sentence. " * 100  # ~2500 chars
    docs = [Document(page_content=large_text, metadata={"source": "test.pdf"})]

    chunks = chunk_documents(docs)

    assert len(chunks) > 1
    for chunk in chunks:
        assert len(chunk.page_content) <= 500


def test_chunker_preserves_small_document():
    """Verify that a small document stays as a single chunk."""
    small_text = "Short text."
    docs = [Document(page_content=small_text, metadata={"source": "test.pdf"})]

    chunks = chunk_documents(docs)

    assert len(chunks) == 1
    assert chunks[0].page_content == small_text
