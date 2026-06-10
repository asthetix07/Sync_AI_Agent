import { NextRequest, NextResponse } from "next/server";

/**
 * GET  /api/sessions/:sessionId  → Retrieve full chat history
 * DELETE /api/sessions/:sessionId → Delete a session
 *
 * Proxies session-specific requests to the FastAPI backend.
 * Forwards the browser's httpOnly cookie for authentication.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const backendUrl = process.env.BACKEND_BASE_URL;
  const { sessionId } = await params;

  if (!backendUrl) {
    return NextResponse.json(
      { error: "Server misconfigured" },
      { status: 500 }
    );
  }

  try {
    const cookieHeader = req.headers.get("cookie") || "";

    const response = await fetch(`${backendUrl}/sessions/${sessionId}`, {
      headers: {
        "Content-Type": "application/json",
        Cookie: cookieHeader,
      },
    });

    if (!response.ok) {
      console.error("[Server] Session GET backend error:", response.status);
      return NextResponse.json(
        { error: "Request failed" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("[Server] Session GET proxy error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const backendUrl = process.env.BACKEND_BASE_URL;
  const { sessionId } = await params;

  if (!backendUrl) {
    return NextResponse.json(
      { error: "Server misconfigured" },
      { status: 500 }
    );
  }

  try {
    const cookieHeader = req.headers.get("cookie") || "";

    const response = await fetch(`${backendUrl}/sessions/${sessionId}`, {
      method: "DELETE",
      headers: {
        Cookie: cookieHeader,
      },
    });

    if (!response.ok) {
      console.error("[Server] Session DELETE backend error:", response.status);
      return NextResponse.json(
        { error: "Delete failed" },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[Server] Session DELETE proxy error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
