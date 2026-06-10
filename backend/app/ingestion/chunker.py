"""
Document Chunker — splits large documents into smaller overlapping chunks
for optimal embedding and retrieval.
"""

from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document
from typing import List
from app.utils.logger import logger


def chunk_documents(documents: List[Document]) -> List[Document]:
    """
    Split large documents into smaller overlapping chunks.

    chunk_size=500   → each chunk is max 500 characters
    chunk_overlap=50 → consecutive chunks share 50 characters
                       (prevents losing context at chunk boundaries)
    """
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=50,
        separators=["\n\n", "\n", " ", ""],
    )
    chunks = splitter.split_documents(documents)
    logger.info(
        f"Chunked {len(documents)} document(s) into {len(chunks)} chunks "
        f"(size=500, overlap=50)"
    )
    return chunks
