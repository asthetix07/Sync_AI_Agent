import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/auth/refresh
 *
 * Proxies the token refresh request to the FastAPI backend.
 * Forwards the browser's cookies so the backend can read the
 * httpOnly `refresh_token` cookie and issue a new `access_token`.
 *
 * On success, the backend returns `Set-Cookie` headers for the
 * new access token. This proxy forwards those headers to the browser.
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

    const response = await fetch(`${backendUrl}/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookieHeader,
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Token refresh failed" },
        { status: response.status }
      );
    }

    const data = await response.json();
    const res = NextResponse.json(data);

    // Forward ALL Set-Cookie headers from the backend
    const setCookieHeaders = response.headers.getSetCookie?.() ?? [];
    if (setCookieHeaders.length > 0) {
      for (const cookie of setCookieHeaders) {
        res.headers.append("set-cookie", cookie);
      }
    } else {
      // Fallback for environments where getSetCookie is not available
      const setCookie = response.headers.get("set-cookie");
      if (setCookie) {
        res.headers.set("set-cookie", setCookie);
      }
    }

    return res;
  } catch (err) {
    console.error("[Server] Token refresh proxy error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
