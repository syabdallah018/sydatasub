import { NextRequest, NextResponse } from "next/server";
import { createAdminSessionResponse, validateAdminPassword } from "@/lib/adminAuth";
import { enforceRateLimit, rejectCrossSiteMutation } from "@/lib/security";

/**
 * POST /api/admin/login - Admin password authentication
 * Returns a special admin token that must be included in X-Admin-Token header
 */
export async function POST(req: NextRequest) {
  try {
    const originError = rejectCrossSiteMutation(req, { requireOrigin: true });
    if (originError) return originError;

    const rateLimitError = enforceRateLimit(req, "login", "admin-login");
    if (rateLimitError) return rateLimitError;

    const { password } = await req.json();

    if (!password) {
      return NextResponse.json(
        { error: "Password required" },
        { status: 400 }
      );
    }

    if (!process.env.ADMIN_PASSWORD) {
      return NextResponse.json(
        { error: "Admin password not configured" },
        { status: 500 }
      );
    }

    if (!validateAdminPassword(password)) {
      return NextResponse.json(
        { error: "Invalid admin password" },
        { status: 401 }
      );
    }

    return createAdminSessionResponse();
  } catch (error) {
    console.error("Admin login error:", error);
    return NextResponse.json(
      { error: "Login failed" },
      { status: 500 }
    );
  }
}
