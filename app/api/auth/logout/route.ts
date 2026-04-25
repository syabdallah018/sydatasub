import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = 'force-dynamic';

const utf8Headers = { "Content-Type": "application/json; charset=utf-8" };

export async function POST(request: NextRequest) {
  try {
    // Clear the session cookie - using standardized name
    const cookieStore = await cookies();
    cookieStore.delete("auth_token");

    return NextResponse.json(
      { message: "Logged out successfully" },
      { status: 200, headers: utf8Headers }
    );
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { error: "Failed to logout" },
      { status: 500, headers: utf8Headers }
    );
  }
}
