import { NextRequest, NextResponse } from "next/server";

export async function middleware(req: NextRequest) {
  const isApi = req.nextUrl.pathname.startsWith("/api/");
  const origin = req.headers.get("origin") || "*";

  // Handle CORS Preflight (OPTIONS) for all API endpoints
  if (isApi && req.method === "OPTIONS") {
    const preflight = new NextResponse(null, { status: 204 });
    preflight.headers.set("Access-Control-Allow-Origin", origin);
    preflight.headers.set("Access-Control-Allow-Credentials", "true");
    preflight.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
    preflight.headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, x-client, x-app-platform, *"
    );
    preflight.headers.set("Access-Control-Max-Age", "86400");
    return preflight;
  }

  if (req.nextUrl.pathname.startsWith("/api/admin/")) {
    const publicAdminApi =
      req.nextUrl.pathname === "/api/admin/login" ||
      req.nextUrl.pathname === "/api/admin/verify";

    if (!publicAdminApi) {
      const hasAdminSession = Boolean(req.cookies.get("sy_admin_session")?.value);
      if (!hasAdminSession) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }
  }

  if (req.nextUrl.pathname.startsWith("/admin/")) {
    const hasAdminSession = Boolean(req.cookies.get("sy_admin_session")?.value);
    if (!hasAdminSession) {
      return NextResponse.redirect(new URL("/admin", req.url));
    }
  }

  const response = NextResponse.next();

  // ===== CRITICAL: Cache-Control Headers for WebView Compatibility =====
  // Prevents Android WebView and browsers from aggressively caching responses
  // This forces revalidation on every request, especially for real-time data like balance

  // SW and Next runtime assets: force fresh fetch after deployment for WebView stability.
  if (req.nextUrl.pathname === "/sw.js" || req.nextUrl.pathname.startsWith("/_next/")) {
    response.headers.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0"
    );
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");
    response.headers.set("Surrogate-Control", "no-store");
  }

  // API Routes: No cache (must always fetch fresh data) + CORS
  if (isApi) {
    response.headers.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0"
    );
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");
    response.headers.set("Surrogate-Control", "no-store");
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Allow-Credentials", "true");
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
    response.headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, x-client, x-app-platform, *"
    );
    response.headers.set("Cross-Origin-Resource-Policy", "cross-origin");
  } else {
    response.headers.set("Cross-Origin-Resource-Policy", "same-origin");
  }

  // App/Dashboard Routes: Minimal cache with forced revalidation
  if (
    req.nextUrl.pathname.startsWith("/app/") ||
    req.nextUrl.pathname.startsWith("/dashboard")
  ) {
    response.headers.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0"
    );
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");
    response.headers.set("Surrogate-Control", "no-store");
  }

  // Landing/Public Pages: Cache but allow stale
  if (
    !isApi &&
    !req.nextUrl.pathname.startsWith("/app/") &&
    !req.nextUrl.pathname.startsWith("/dashboard") &&
    req.nextUrl.pathname !== "/sw.js" &&
    !req.nextUrl.pathname.startsWith("/_next/")
  ) {
    response.headers.set("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400");
  }

  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  response.headers.set("X-DNS-Prefetch-Control", "off");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  if (req.nextUrl.protocol === "https:") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload"
    );
  }
  response.headers.set(
    "Content-Security-Policy",
    "default-src 'self' blob: data:; img-src 'self' data: blob: https:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://www.gstatic.com; worker-src 'self' blob:; connect-src 'self' https: data: blob:; frame-ancestors 'none'; base-uri 'self' /app/ /flutter/; form-action 'self'"
  );

  return response;
}

export const config = {
  matcher: ["/:path*"],
};
