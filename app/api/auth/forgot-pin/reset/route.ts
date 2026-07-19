import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import bcryptjs from "bcryptjs";
import { z } from "zod";
import { enforceRateLimit, rejectCrossSiteMutation } from "@/lib/security";

const resetSchema = z.object({
  otpCode: z.string().regex(/^\d{6}$/, "Invalid verification code format"),
  newPin: z.string().regex(/^\d{6}$/, "New PIN must be 6 digits"),
  confirmPin: z.string().regex(/^\d{6}$/, "Confirm PIN must be 6 digits"),
});

/**
 * POST /api/auth/forgot-pin/reset
 * Consumes the validated OTP and saves the new hashed PIN
 */
export async function POST(req: NextRequest) {
  try {
    const originError = rejectCrossSiteMutation(req, { requireOrigin: true });
    if (originError) return originError;

    const rateLimitError = enforceRateLimit(req, "forgot-pin", "reset-action");
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
    const { otpCode, newPin, confirmPin } = resetSchema.parse(body);

    if (newPin !== confirmPin) {
      return NextResponse.json(
        { error: "New PIN and confirmation PIN do not match" },
        { status: 400 }
      );
    }

    // Double-verify OTP code presence and validity
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
        { error: "Verification session expired. Please request a new code." },
        { status: 400 }
      );
    }

    // Hash the new PIN and write updates
    const hashedPin = await bcryptjs.hash(newPin, 10);
    await prisma.user.update({
      where: { id: sessionUser.userId },
      data: { pinHash: hashedPin },
    });

    // Delete all user reset OTPs to finalize consumption
    await prisma.otpToken.deleteMany({
      where: { email: user.email, purpose: "RESET_PIN" },
    });

    return NextResponse.json(
      { success: true, message: "PIN reset successfully!" },
      { status: 200 }
    );
  } catch (error) {
    console.error("[FORGOT PIN RESET ERROR]", error);
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
