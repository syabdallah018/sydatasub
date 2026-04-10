import { NextRequest, NextResponse } from "next/server";

export async function middleware(req: NextRequest) {
  // Admin routes are handled client-side with session storage
  // No middleware protection needed -admin layout handles password verification
  
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
