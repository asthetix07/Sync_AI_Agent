"""
RAG Chain — Retrieval-Augmented Generation.
When a user has uploaded PDFs, this module retrieves relevant chunks
from the vector store and injects them into the LLM prompt as context.

Uses Gemini for generation with API key rotation for concurrent users.
Gemini is also used for embeddings (handled by the vector store layer).
"""

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.output_parsers import StrOutputParser
from langchain_core.documents import Document
from typing import List, Optional

from app.db.vector_store_factory import vector_store
from app.core.key_pool import KeyPool
from app.config import settings
from app.utils.logger import logger

# ── API Key Pool for RAG LLM ─────────────────────────────
_gemini_key_pool = KeyPool.from_csv(settings.get_gemini_keys(), name="gemini_rag")


def _get_rag_llm() -> ChatGoogleGenerativeAI:
    """Get a ChatGoogleGenerativeAI instance with rotated API key."""
    return ChatGoogleGenerativeAI(
        model=settings.gemini_chat_model,
        google_api_key=_gemini_key_pool.get_key(),
        temperature=0.3,
    )


# ── RAG Prompt Template ──────────────────────────────────
# Note: The identity prompt is NOT injected here because RAG
# responses are purely factual extractions from user documents.
# The chatbot identity is enforced in agent.py for direct chat.
RAG_PROMPT = ChatPromptTemplate.from_messages([
    (
        "system",
        "You are Sync AI — a helpful assistant created by the Sync AI team. "
        "Use ONLY the context below to answer the question. "
        "If the answer isn't in the context, say so clearly — do not guess or fabricate.\n\n"
        "Context:\n{context}",
    ),
    MessagesPlaceholder(variable_name="history"),
    ("human", "{question}"),
])


def format_docs(docs: List[Document]) -> str:
    """Join retrieved chunks into a single context string."""
    return "\n\n---\n\n".join(doc.page_content for doc in docs)


def get_rag_docs(session_id: str, question: str) -> List[Document]:
    """Retrieve relevant chunks from vector DB."""
    try:
        return vector_store.similarity_search(
            query=question,
            session_id=session_id,
            k=4,
        )
    except Exception as e:
        logger.error(f"RAG document retrieval failed: {e}")
        return []


def rag_chat(session_id: str, question: str, history: list) -> Optional[str]:
    """
    Attempt to answer a question using uploaded PDF context (synchronous).
    """
    docs = get_rag_docs(session_id, question)

    # Step 2: if no docs found, signal caller to use plain chat
    if not docs:
        logger.info(f"No RAG documents found for session {session_id[:8]}... — falling back")
        return None

    context = format_docs(docs)
    logger.info(
        f"RAG: found {len(docs)} chunks, context length={len(context)} chars"
    )

    # Step 3: run through RAG chain (Gemini with key rotation)
    rag_llm = _get_rag_llm()
    chain = RAG_PROMPT | rag_llm | StrOutputParser()
    return chain.invoke({
        "context": context,
        "question": question,
        "history": history,
    })


from typing import AsyncGenerator

async def rag_chat_stream(
    question: str,
    history: list,
    docs: List[Document],
) -> AsyncGenerator[str, None]:
    """
    Stream RAG response chunks asynchronously using astream().
    """
    context = format_docs(docs)
    logger.info(
        f"RAG Stream: found {len(docs)} chunks, context length={len(context)} chars"
    )

    rag_llm = _get_rag_llm()
    chain = RAG_PROMPT | rag_llm | StrOutputParser()
    
    async for chunk in chain.astream({
        "context": context,
        "question": question,
        "history": history,
    }):
        yield chunk
