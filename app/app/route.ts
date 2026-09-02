import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET() {
  const filePath = path.join(process.cwd(), "public", "app", "index.html");
  try {
    const html = fs.readFileSync(filePath, "utf-8");
    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=0, must-revalidate",
        "X-Frame-Options": "SAMEORIGIN",
      },
    });
  } catch {
    return new NextResponse(
      "<!DOCTYPE html><html><head><title>SY DATA SUB</title><meta name='viewport' content='width=device-width, initial-scale=1.0'></head><body style='font-family:sans-serif;text-align:center;padding:40px;'><h2>SY DATA SUB App Loading...</h2><p>Please refresh in a moment.</p></body></html>",
      {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      }
    );
  }
}
