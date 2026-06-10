import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/upload-pdf
 *
 * Proxies PDF uploads to the FastAPI backend.
 * Forwards the browser's httpOnly cookie for authentication.
 * Streams the FormData directly — keeps backend URL server-side.
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
    const formData = await req.formData();
    const cookieHeader = req.headers.get("cookie") || "";

    const response = await fetch(`${backendUrl}/upload-pdf`, {
      method: "POST",
      headers: {
        Cookie: cookieHeader,
      },
      body: formData,
    });

    if (!response.ok) {
      console.error("[Server] Upload backend error:", response.status);
      return NextResponse.json(
        { error: "Upload failed" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("[Server] Upload proxy error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
