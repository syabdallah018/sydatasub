import { NextRequest, NextResponse } from "next/server";

export async function middleware(req: NextRequest) {
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
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");
    response.headers.set("Surrogate-Control", "no-store");
  }

  // API Routes: No cache (must always fetch fresh data)
  if (req.nextUrl.pathname.startsWith("/api/")) {
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");
    response.headers.set("Surrogate-Control", "no-store");
  }
  
  // App Routes: Minimal cache with forced revalidation
  if (req.nextUrl.pathname.startsWith("/app/")) {
    response.headers.set("Cache-Control", "public, max-age=0, must-revalidate");
    response.headers.set("Pragma", "no-cache");
  }
  
  // Landing/Public Pages: Cache but allow stale
  if (
    !req.nextUrl.pathname.startsWith("/api/") &&
    !req.nextUrl.pathname.startsWith("/app/") &&
    req.nextUrl.pathname !== "/sw.js" &&
    !req.nextUrl.pathname.startsWith("/_next/")
  ) {
    response.headers.set("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400");
  }

  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  response.headers.set("Cross-Origin-Resource-Policy", "same-origin");
  response.headers.set("X-DNS-Prefetch-Control", "off");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  if (req.nextUrl.protocol === "https:") {
    response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  }
  response.headers.set(
    "Content-Security-Policy",
    "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; script-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self' https:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
  );
  
  return response;
}

export const config = {
  matcher: ["/:path*"],
};
