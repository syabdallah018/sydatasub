import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcryptjs from "bcryptjs";
import { z } from "zod";
import { signToken } from "@/lib/auth";

const loginSchema = z.object({
  phone: z.string().regex(/^0[0-9]{10}$/, "Invalid phone number"),
  pin: z.string().regex(/^\d{6}$/, "Invalid PIN"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { phone, pin } = loginSchema.parse(body);

    const user = await prisma.user.findUnique({
      where: { phone },
      include: {
        virtualAccount: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    if (user.isBanned) {
      return NextResponse.json(
        { error: "Account is banned" },
        { status: 403 }
      );
    }

    if (!user.pinHash) {
      return NextResponse.json(
        { error: "Account not properly configured" },
        { status: 400 }
      );
    }

    const isPinValid = await bcryptjs.compare(pin, user.pinHash);

    if (!isPinValid) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const token = await signToken({
      userId: user.id,
      email: user.email || user.phone,
      role: user.role,
    });

    const response = NextResponse.json(
      {
        message: "Login successful",
        user: {
          id: user.id,
          phone: user.phone,
          fullName: user.fullName,
          role: user.role,
          tier: user.tier || "user",
          balance: user.balance,
          virtualAccount: user.virtualAccount,
        },
      },
      { status: 200 }
    );

    // Set simple session cookie with userId (no JWT)
    response.cookies.set("sy_session", user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("[LOGIN ERROR]", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
