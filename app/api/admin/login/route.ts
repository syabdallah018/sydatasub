import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

/**
 * POST /api/admin/login - Admin password authentication
 * Returns a special admin token that must be included in X-Admin-Token header
 */
export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();

    if (!password) {
      return NextResponse.json(
        { error: "Password required" },
        { status: 400 }
      );
    }

    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword) {
      return NextResponse.json(
        { error: "Admin password not configured" },
        { status: 500 }
      );
    }

    if (password !== adminPassword) {
      return NextResponse.json(
        { error: "Invalid admin password" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Admin authenticated. Include X-Admin-Token header in requests.",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Admin login error:", error);
    return NextResponse.json(
      { error: "Login failed" },
      { status: 500 }
    );
  }
}
