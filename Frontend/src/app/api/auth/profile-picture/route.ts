import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/auth/profile-picture
 *
 * Proxies profile picture upload to FastAPI backend.
 * Forwards httpOnly auth cookies and passes back any updated auth cookies.
 */
export async function POST(req: NextRequest) {
  const backendUrl = process.env.BACKEND_BASE_URL;

  if (!backendUrl) {
    return NextResponse.json(
      { error: "Server misconfigured: BACKEND_BASE_URL is missing" },
      { status: 500 }
    );
  }

  try {
    const formData = await req.formData();
    const cookieHeader = req.headers.get("cookie") || "";

    const response = await fetch(`${backendUrl}/auth/profile-picture`, {
      method: "POST",
      headers: {
        Cookie: cookieHeader,
      },
      body: formData,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return NextResponse.json(
        { error: data.detail || "Failed to update profile picture" },
        { status: response.status }
      );
    }

    const nextResponse = NextResponse.json(data);

    // Forward Set-Cookie header if provided by backend
    const setCookie = response.headers.get("set-cookie");
    if (setCookie) {
      nextResponse.headers.set("set-cookie", setCookie);
    }

    return nextResponse;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[Server] Profile picture proxy error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
