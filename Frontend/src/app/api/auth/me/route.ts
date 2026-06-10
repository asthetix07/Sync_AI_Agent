import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/auth/me
 *
 * Proxies the "who am I?" request to the FastAPI backend.
 * Forwards the browser's httpOnly cookie so the backend can
 * extract and verify the JWT to return user info.
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

    const response = await fetch(`${backendUrl}/auth/me`, {
      method: "GET",
      headers: {
        Cookie: cookieHeader,
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("[Server] Auth /me proxy error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
