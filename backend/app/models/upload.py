"""
Pydantic schemas for the /upload-pdf endpoint.
"""

from pydantic import BaseModel


class UploadResponse(BaseModel):
    """Response body for POST /upload-pdf"""
    session_id: str
    filename: str
    chunks_stored: int
