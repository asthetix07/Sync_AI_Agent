"""
Pydantic schemas for the /chat endpoint.
"""

from uuid import UUID
from pydantic import BaseModel, Field, field_validator


class ChatRequest(BaseModel):
    """Request body for POST /chat"""
    session_id: str = Field(..., description="Unique conversation session identifier (must be a valid UUID)")
    message: str = Field(..., min_length=1, description="User message")

    @field_validator("session_id")
    @classmethod
    def validate_uuid(cls, v: str) -> str:
        """Ensure session_id is a valid UUID (required by langchain-postgres)."""
        try:
            UUID(v)
        except ValueError:
            raise ValueError(
                f"session_id must be a valid UUID, got: '{v}'. "
                "Generate one with uuid.uuid4() or crypto.randomUUID()."
            )
        return v


class ChatResponse(BaseModel):
    """Response body for POST /chat"""
    session_id: str
    response: str
