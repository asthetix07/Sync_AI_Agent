"""
Upload API route — POST /upload-pdf
Handles PDF file upload and triggers the ingestion pipeline.
Registers session ownership for user isolation.
"""

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends, Request
from app.models.upload import UploadResponse
from app.ingestion.loader import load_pdf
from app.ingestion.chunker import chunk_documents
from app.ingestion.embedder import embed_and_store
from app.core.dependencies import get_current_user
from app.core.rate_limit import limiter
from app.db.postgres import register_session_owner
from app.utils.logger import logger

router = APIRouter(tags=["Upload"])


@router.post("/upload-pdf", response_model=UploadResponse)
@limiter.limit("5/minute")
async def upload_pdf(
    request: Request,
    session_id: str = Form(..., description="Chat session this PDF belongs to"),
    file: UploadFile = File(..., description="PDF file to process"),
    user: dict = Depends(get_current_user),
):
    """
    Upload a PDF, split it into chunks, embed, and store in the vector DB.
    Requires authentication via httpOnly cookie.
    The chunks are tagged with the session_id for per-session retrieval.
    """
    # Validate file type
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    user_id = user.get("sub", "unknown")
    logger.info(f"POST /upload-pdf — session={session_id[:8]}..., file={file.filename}, user={user_id[:8]}...")

    # Register session ownership (idempotent)
    register_session_owner(session_id, user_id)

    file_bytes = await file.read()

    if len(file_bytes) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    import asyncio

    # Pipeline: load → chunk → embed → store
    documents = await asyncio.to_thread(load_pdf, file_bytes)
    chunks = await asyncio.to_thread(chunk_documents, documents)
    count = await asyncio.to_thread(embed_and_store, chunks, session_id)

    logger.info(f"PDF processed: {file.filename} → {count} chunks stored")

    return UploadResponse(
        session_id=session_id,
        filename=file.filename,
        chunks_stored=count,
    )
