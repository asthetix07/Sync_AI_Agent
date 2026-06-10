import { NextRequest, NextResponse } from "next/server";

/**
 * Next.js Edge Middleware
 *
 * Intercepts incoming requests and checks the `Accept` header.
 * If the client sends `accept: text/markdown` (used by AI bots,
 * LLM crawlers, and tools like Googlebot-Extended), the middleware
 * rewrites the request to the `/llms.txt` API route which serves
 * a comprehensive markdown description of the application.
 *
 * This follows the emerging `llms.txt` convention for making
 * web applications machine-readable for AI agents and crawlers.
 *
 * @see https://llmstxt.org/
 */
export function proxy(request: NextRequest) {
  const acceptHeader = request.headers.get("accept") || "";

  // Check if the client explicitly requests markdown content
  if (acceptHeader.includes("text/markdown")) {
    // Rewrite to the /llms.txt API route handler
    const llmsUrl = new URL("/llms.txt", request.url);
    return NextResponse.rewrite(llmsUrl);
  }

  // For all other requests, continue normally
  return NextResponse.next();
}

/**
 * Matcher config — apply middleware to page routes only.
 * Excludes static assets, API routes, the llms.txt route itself,
 * and internal Next.js paths to avoid infinite rewrites.
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static  (static files)
     * - _next/image   (image optimization)
     * - favicon.ico   (browser favicon)
     * - api/          (API routes)
     * - llms.txt      (avoid infinite rewrite loop)
     * - files with extensions (e.g. .css, .js, .png, .svg)
     */
    "/((?!_next/static|_next/image|favicon\\.ico|api/|llms\\.txt|.*\\..*).*)",
  ],
};
