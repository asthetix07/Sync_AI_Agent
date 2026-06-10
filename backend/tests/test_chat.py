"""
Integration tests for the /chat endpoint.
"""

import uuid
from fastapi.testclient import TestClient
from app.main import app
from app.core.dependencies import get_current_user

# Mock authentication for integration tests
app.dependency_overrides[get_current_user] = lambda: {"sub": "test-user-openid", "name": "Test User", "email": "test@example.com"}

client = TestClient(app)

# Use valid UUID4s as langchain-postgres requires them
TEST_SESSION_1 = str(uuid.uuid4())
TEST_SESSION_2 = str(uuid.uuid4())


def test_chat_returns_response():
    """Verify the chat endpoint returns a valid response stream."""
    response = client.post("/chat", json={
        "session_id": TEST_SESSION_1,
        "message": "Hello, who are you?",
    })
    assert response.status_code == 200
    # Consuming a StreamingResponse in TestClient can be done via response.text
    text = response.text
    assert len(text) > 0


def test_chat_rejects_empty_message():
    """Verify the chat endpoint rejects empty messages."""
    response = client.post("/chat", json={
        "session_id": TEST_SESSION_2,
        "message": "",
    })
    assert response.status_code == 422  # Validation error


def test_chat_rejects_invalid_session_id():
    """Verify the chat endpoint rejects non-UUID session IDs with 422."""
    response = client.post("/chat", json={
        "session_id": "not-a-valid-uuid",
        "message": "Hello",
    })
    assert response.status_code == 422
    detail = response.json()["detail"]
    # Check that the error message mentions UUID validation
    assert any("uuid" in str(err).lower() for err in detail)


def test_health_check():
    """Verify the health check endpoint."""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

