import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.JWT_SECRET || "your-super-secret-jwt-key-min-32-chars");

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Admin routes
  if (pathname.startsWith("/admin")) {
    const token = req.cookies.get("sy_session")?.value;
    if (!token) return NextResponse.redirect(new URL("/app", req.url));
    
    try {
      const { payload } = await jwtVerify(token, secret);
      if (payload?.role !== "ADMIN") {
        return NextResponse.redirect(new URL("/app/dashboard", req.url));
      }
    } catch {
      return NextResponse.redirect(new URL("/app", req.url));
    }
  }

  // Protected app routes
  if (pathname.startsWith("/app/dashboard")) {
    const token = req.cookies.get("sy_session")?.value;
    if (!token) return NextResponse.redirect(new URL("/app", req.url));
    
    try {
      await jwtVerify(token, secret);
    } catch {
      return NextResponse.redirect(new URL("/app", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/app/dashboard/:path*"],
};
