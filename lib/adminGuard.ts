import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";

export async function withAdminGuard(
  request: NextRequest,
  handler: (req: NextRequest) => Promise<Response>
): Promise<Response> {
  try {
    const sessionUser = await getSessionUser(request);

    // Check if user has ADMIN role
    if (sessionUser && sessionUser.role === "ADMIN") {
      return await handler(request);
    }

    // Check if request includes ADMIN_PASSWORD header for alternative admin access
    const adminPassword = request.headers.get("x-admin-password");
    if (adminPassword && process.env.ADMIN_PASSWORD && adminPassword === process.env.ADMIN_PASSWORD) {
      return await handler(request);
    }

    return NextResponse.json(
      { error: "Forbidden." },
      { status: 403 }
    );
  } catch (error) {
    console.error("Admin guard error:", error);
    return NextResponse.json(
      { error: "Unauthorized." },
      { status: 401 }
    );
  }
}
