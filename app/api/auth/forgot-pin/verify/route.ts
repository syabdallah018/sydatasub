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

    const rateLimitError = enforceRateLimit(req, "login", "forgot-pin-verify");
    if (rateLimitError) return rateLimitError;

    const body = await req.json().catch(() => ({}));
    const { otpCode } = verifySchema.parse(body);
    const phone = typeof body?.phone === "string" ? body.phone.replace(/\D/g, "") : "";

    const sessionUser = await getSessionUser(req);
    let user = null;

    if (sessionUser) {
      user = await prisma.user.findUnique({
        where: { id: sessionUser.userId },
        select: { email: true },
      });
    } else if (phone && phone.length === 11) {
      user = await prisma.user.findUnique({
        where: { phone },
        select: { email: true },
      });
    } else {
      return NextResponse.json(
        { error: "Phone number or active session is required." },
        { status: 400 }
      );
    }

    if (!user || !user.email) {
      return NextResponse.json({ error: "Email not found for account." }, { status: 400 });
    }

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
