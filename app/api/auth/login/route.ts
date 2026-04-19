import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcryptjs from "bcryptjs";
import { z } from "zod";
import { signToken } from "@/lib/auth";
import { getUserSelectCompat, normalizeUserCompat, withCompatibleUserFields } from "@/lib/user-compat";

const loginSchema = z.object({
  phone: z.string().regex(/^0[0-9]{10}$/, "Invalid phone number"),
  pin: z.string().regex(/^\d{6}$/, "Invalid PIN"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { phone, pin } = loginSchema.parse(body);
    const compat = await getUserSelectCompat();

    const user = await prisma.user.findUnique({
      where: { phone },
      select: {
        id: true,
        phone: true,
        fullName: true,
        role: true,
        tier: true,
        balance: true,
        email: true,
        pinHash: true,
        isBanned: true,
        ...withCompatibleUserFields({}, compat),
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

    const normalizedUser = normalizeUserCompat(user);

    const token = await signToken({
      userId: normalizedUser.id,
      email: normalizedUser.email || normalizedUser.phone,
      role: normalizedUser.role,
    });

    const response = NextResponse.json(
      {
        message: "Login successful",
        user: {
          id: user.id,
          phone: normalizedUser.phone,
          fullName: normalizedUser.fullName,
          role: normalizedUser.role,
          tier: normalizedUser.tier || "user",
          balance: normalizedUser.balance,
          rewardBalance: normalizedUser.rewardBalance,
          agentRequestStatus: normalizedUser.agentRequestStatus,
          virtualAccount: normalizedUser.virtualAccount,
        },
      },
      { status: 200 }
    );

    // Set simple session cookie with userId (no JWT)
    response.cookies.set("sy_session", normalizedUser.id, {
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
