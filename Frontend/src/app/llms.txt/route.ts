import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

/**
 * GET /llms.txt
 *
 * Serves the llms.txt markdown file with the correct Content-Type.
 * This route is also reachable directly by bots visiting /llms.txt.
 */
export async function GET() {
  const filePath = path.join(process.cwd(), "public", "llms-content.md");
  const content = await fs.readFile(filePath, "utf-8");

  return new NextResponse(content, {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
    },
  });
}
