import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/auth/logout
 *
 * Proxies the logout request to the FastAPI backend.
 * Forwards the browser's cookies so the backend can clear
 * the httpOnly `access_token` cookie.
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
    const cookieHeader = req.headers.get("cookie") || "";

    const response = await fetch(`${backendUrl}/auth/logout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookieHeader,
      },
    });

    if (!response.ok) {
      console.error("[Server] Logout backend error:", response.status);
      return NextResponse.json(
        { error: "Logout failed" },
        { status: response.status }
      );
    }

    const data = await response.json();
    const res = NextResponse.json(data);

    // Forward the Set-Cookie header from backend to clear the cookie in the browser
    const setCookie = response.headers.get("set-cookie");
    if (setCookie) {
      res.headers.set("set-cookie", setCookie);
    }

    return res;
  } catch (err) {
    console.error("[Server] Logout proxy error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
