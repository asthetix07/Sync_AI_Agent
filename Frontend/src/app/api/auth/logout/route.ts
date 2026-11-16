import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/auth/logout
 *
 * Proxies the logout request to the FastAPI backend.
 * Forwards the browser's cookies so the backend can clear
 * both the httpOnly `access_token` and `refresh_token` cookies.
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

    // Forward ALL Set-Cookie headers from backend to clear both cookies
    const setCookieHeaders = response.headers.getSetCookie?.() ?? [];
    if (setCookieHeaders.length > 0) {
      for (const cookie of setCookieHeaders) {
        res.headers.append("set-cookie", cookie);
      }
    } else {
      const setCookie = response.headers.get("set-cookie");
      if (setCookie) {
        res.headers.set("set-cookie", setCookie);
      }
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
