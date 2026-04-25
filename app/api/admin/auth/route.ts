import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";

const utf8Headers = { "Content-Type": "application/json; charset=utf-8" };

export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated and has ADMIN role
    const sessionUser = await getSessionUser(request);

    if (!sessionUser || sessionUser.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 403, headers: utf8Headers }
      );
    }

    // If verification passes, return success
    return NextResponse.json(
      { success: true, message: "Admin access verified" },
      { status: 200, headers: utf8Headers }
    );
  } catch (error) {
    console.error("Admin auth error:", error);
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500, headers: { "Content-Type": "application/json; charset=utf-8" } }
    );
  }
}

