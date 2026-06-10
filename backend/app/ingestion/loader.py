"""
PDF Loader — reads PDF bytes into LangChain Documents.
"""

from langchain_community.document_loaders import PyPDFLoader
from langchain_core.documents import Document
from typing import List
from app.utils.logger import logger
import tempfile
import os


def load_pdf(file_bytes: bytes) -> List[Document]:
    """
    Write PDF bytes to a temp file, load with PyPDFLoader, then clean up.
    Returns a list of LangChain Document objects (one per page).
    """
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as f:
        f.write(file_bytes)
        temp_path = f.name

    try:
        loader = PyPDFLoader(temp_path)
        documents = loader.load()
        logger.info(f"Loaded PDF: {len(documents)} pages")
        return documents
    finally:
        os.unlink(temp_path)  # always clean up the temp file
