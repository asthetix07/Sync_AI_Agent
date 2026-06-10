"""
Abstract Vector Store Interface.
All vector store implementations must conform to this contract.
"""

from abc import ABC, abstractmethod
from typing import List
from langchain_core.documents import Document


class VectorStore(ABC):
    """Abstract base class for vector storage backends."""

    @abstractmethod
    def add_documents(self, documents: List[Document], session_id: str) -> None:
        """Store embedded documents, tagged with the given session_id."""
        pass

    @abstractmethod
    def similarity_search(self, query: str, session_id: str, k: int = 4) -> List[Document]:
        """Find the k most relevant documents for a query within a session."""
        pass

    @abstractmethod
    def delete_by_session(self, session_id: str) -> None:
        """Remove all documents belonging to a given session."""
        pass
