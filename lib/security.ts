import { NextRequest, NextResponse } from "next/server";
import { RATE_LIMITS, checkRateLimit, getClientIp, getRateLimitKey } from "@/lib/rateLimiter";

type RateLimitName = keyof typeof RATE_LIMITS;

export function rejectCrossSiteMutation(
  req: NextRequest,
  options?: { requireOrigin?: boolean }
): NextResponse | null {
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method.toUpperCase())) {
    return null;
  }

  const requestOrigin = req.nextUrl.origin;
  const originHeader = req.headers.get("origin");
  const refererHeader = req.headers.get("referer");

  const candidate = originHeader || refererHeader;
  if (!candidate) {
    if (options?.requireOrigin) {
      return NextResponse.json({ error: "Missing request origin" }, { status: 403 });
    }
    return null;
  }

  try {
    const parsedOrigin = new URL(candidate).origin;
    if (parsedOrigin !== requestOrigin) {
      return NextResponse.json({ error: "Cross-site request blocked" }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }

  return null;
}

export function enforceRateLimit(
  req: NextRequest,
  name: RateLimitName,
  endpointOverride?: string
): NextResponse | null {
  const config = RATE_LIMITS[name];
  const key = getRateLimitKey(getClientIp(req), endpointOverride || req.nextUrl.pathname);

  if (!checkRateLimit(key, config.maxAttempts, config.windowMs)) {
    return NextResponse.json(
      { error: "Too many requests. Please wait and try again." },
      { status: 429 }
    );
  }

  return null;
}

export function secureCompare(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) {
    return false;
  }

  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return mismatch === 0;
}

export function getServerBaseUrl(req: NextRequest): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
  return appUrl ? appUrl.replace(/\/$/, "") : req.nextUrl.origin;
}
