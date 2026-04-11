import { NextRequest, NextResponse } from "next/server";

export async function middleware(req: NextRequest) {
  const response = NextResponse.next();
  
  // ===== CRITICAL: Cache-Control Headers for WebView Compatibility =====
  // Prevents Android WebView and browsers from aggressively caching responses
  // This forces revalidation on every request, especially for real-time data like balance
  
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
  if (!req.nextUrl.pathname.startsWith("/api/") && !req.nextUrl.pathname.startsWith("/app/")) {
    response.headers.set("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400");
  }
  
  return response;
}

export const config = {
  matcher: ["/:path*"],
};
