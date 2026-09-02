import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const url = new URL(req.url);
  url.pathname = "/app";
  return NextResponse.redirect(url, 308);
}
