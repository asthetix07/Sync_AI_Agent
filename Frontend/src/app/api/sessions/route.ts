import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/sessions
 *
 * Proxies session listing to the FastAPI backend.
 * Forwards the browser's httpOnly cookie for authentication.
 */
export async function GET(req: NextRequest) {
  const backendUrl = process.env.BACKEND_BASE_URL;

  if (!backendUrl) {
    return NextResponse.json(
      { error: "Server misconfigured" },
      { status: 500 }
    );
  }

  try {
    const cookieHeader = req.headers.get("cookie") || "";

    const response = await fetch(`${backendUrl}/sessions`, {
      headers: {
        "Content-Type": "application/json",
        Cookie: cookieHeader,
      },
    });

    if (!response.ok) {
      console.error("[Server] Sessions list backend error:", response.status);
      return NextResponse.json(
        { error: "Request failed" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("[Server] Sessions list proxy error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
