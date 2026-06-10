import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/auth/google
 *
 * Proxies Google OAuth credential verification to the FastAPI backend.
 * The browser sends { credential, state } here — never directly to the backend.
 *
 * On success, the backend returns a `Set-Cookie` header with the httpOnly
 * `access_token` JWT cookie. This proxy forwards that header to the browser.
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

    const response = await fetch(`${backendUrl}/auth/google`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookieHeader,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Server] Google auth backend error:", errorText);
      return NextResponse.json(
        { error: "Authentication failed" },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Forward Set-Cookie headers from the backend (httpOnly JWT cookie)
    const res = NextResponse.json(data);
    const setCookie = response.headers.get("set-cookie");
    if (setCookie) {
      res.headers.set("set-cookie", setCookie);
    }

    return res;
  } catch (err) {
    console.error("[Server] Google auth proxy error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
