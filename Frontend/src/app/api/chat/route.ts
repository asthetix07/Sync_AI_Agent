import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/chat
 *
 * Proxies chat messages to the FastAPI backend.
 * Forwards the browser's httpOnly cookie for authentication.
 * Keeps the backend URL server-side only.
 */
export async function POST(req: NextRequest) {
  const backendUrl = process.env.BACKEND_BASE_URL;

  if (!backendUrl) {
    return NextResponse.json(
      { error: "Server misconfigured" },
      { status: 500 }
    );
  }

  try {
    const body = await req.json();
    const cookieHeader = req.headers.get("cookie") || "";

    const response = await fetch(`${backendUrl}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookieHeader,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      console.error("[Server] Chat backend error:", response.status);
      return NextResponse.json(
        { error: "Request failed" },
        { status: response.status }
      );
    }

    // Set up standard headers for a stream response
    const headers = new Headers();
    headers.set("Content-Type", "text/event-stream");
    headers.set("Cache-Control", "no-cache, no-transform");
    headers.set("Connection", "keep-alive");

    // Pass response.body directly to return a streaming response
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  } catch (err) {
    console.error("[Server] Chat proxy error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
