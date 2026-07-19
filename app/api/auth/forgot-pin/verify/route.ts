import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { enforceRateLimit, rejectCrossSiteMutation } from "@/lib/security";

const verifySchema = z.object({
  otpCode: z.string().regex(/^\d{6}$/, "Invalid verification code format"),
});

/**
 * POST /api/auth/forgot-pin/verify
 * Asserts OTP match and validity prior to inputting new PIN values
 */
export async function POST(req: NextRequest) {
  try {
    const originError = rejectCrossSiteMutation(req, { requireOrigin: true });
    if (originError) return originError;

    const rateLimitError = enforceRateLimit(req, "forgot-pin", "verify-code");
    if (rateLimitError) return rateLimitError;

    const sessionUser = await getSessionUser(req);
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Retrieve user email
    const user = await prisma.user.findUnique({
      where: { id: sessionUser.userId },
      select: { email: true },
    });

    if (!user || !user.email) {
      return NextResponse.json({ error: "Email not found" }, { status: 400 });
    }

    const body = await req.json();
    const { otpCode } = verifySchema.parse(body);

    // Look up code
    const otpRecord = await prisma.otpToken.findFirst({
      where: {
        email: user.email,
        otp: otpCode,
        purpose: "RESET_PIN",
        expiresAt: { gte: new Date() },
      },
    });

    if (!otpRecord) {
      return NextResponse.json(
        { error: "Invalid or expired verification code" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("[FORGOT PIN VERIFY ERROR]", error);
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
