import { NextRequest, NextResponse } from "next/server";
import { signToken } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { queryOne } from "@/lib/db";
import { checkRateLimit, resetRateLimit } from "@/lib/rateLimiter";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const utf8Headers = { "Content-Type": "application/json; charset=utf-8" };

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, pin } = body;

    // Validation
    if (!phone || !pin) {
      return NextResponse.json(
        { error: "Phone and PIN are required" },
        { status: 400, headers: utf8Headers }
      );
    }

    if (!/^0[0-9]{10}$/.test(phone)) {
      return NextResponse.json(
        { error: "Invalid phone format" },
        { status: 400, headers: utf8Headers }
      );
    }

    // Check rate limit for this phone number
    const rateLimitCheck = checkRateLimit(phone, "login", {
      maxAttempts: 5,
      windowMs: 15 * 60 * 1000, // 15 minutes
    });

    if (!rateLimitCheck.allowed) {
      const resetTime = new Date(rateLimitCheck.resetTime || Date.now()).toISOString();
      return NextResponse.json(
        {
          error: "Too many login attempts. Please try again later.",
          retryAfter: rateLimitCheck.resetTime,
        },
        { status: 429, headers: utf8Headers }
      );
    }

    // Find user by phone
    const user = await queryOne<{
      id: string;
      phone: string;
      name: string;
      pin: string;
      isActive: boolean;
      role: string;
    }>(
      `SELECT id, phone, name, "pin", "isActive", role FROM "User" WHERE phone = $1`,
      [phone]
    );

    if (!user) {
      return NextResponse.json(
        { error: "Invalid phone or PIN" },
        { status: 401, headers: utf8Headers }
      );
    }

    // Check if user is active
    if (!user.isActive) {
      return NextResponse.json(
        { error: "Account is disabled" },
        { status: 403, headers: utf8Headers }
      );
    }

    // Verify PIN
    if (!user.pin) {
      return NextResponse.json(
        { error: "Account not properly configured" },
        { status: 500, headers: utf8Headers }
      );
    }

    const pinValid = await bcrypt.compare(pin, user.pin);

    if (!pinValid) {
      return NextResponse.json(
        { error: "Invalid phone or PIN" },
        { status: 401, headers: utf8Headers }
      );
    }

    // Reset rate limit on successful login
    resetRateLimit(phone, "login");

    // Generate JWT token
    const token = await signToken({
      userId: user.id,
      phone: user.phone,
      role: user.role as "USER" | "AGENT" | "ADMIN",
    });

    // Set token in cookie - using standardized name
    const cookieStore = await cookies();
    cookieStore.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });

    return NextResponse.json(
      {
        message: "Login successful",
        user: {
          id: user.id,
          phone: user.phone,
          name: user.name,
          role: user.role,
        },
        token,
      },
      { status: 200, headers: utf8Headers }
    );
  } catch (error: any) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Login failed", details: error.message },
      { status: 500, headers: utf8Headers }
    );
  }
}
