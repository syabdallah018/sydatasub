import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendPinResetEmail } from "@/lib/email";
import { enforceRateLimit, rejectCrossSiteMutation } from "@/lib/security";

/**
 * POST /api/auth/forgot-pin/send
 * Generates and dispatches a 6-digit PIN reset verification OTP to the user's email
 */
export async function POST(req: NextRequest) {
  try {
    const originError = rejectCrossSiteMutation(req, { requireOrigin: true });
    if (originError) return originError;

    // Strict rate limiting: max 1 reset code per minute per IP/Session
    const rateLimitError = enforceRateLimit(req, "forgot-pin", "send-code");
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
      return NextResponse.json(
        { error: "No registered email address found. Please contact support." },
        { status: 400 }
      );
    }

    // Generate 6-digit random code
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes validation

    // Clear older reset OTPs for this email to prevent spam clutter
    await prisma.otpToken.deleteMany({
      where: { email: user.email, purpose: "RESET_PIN" },
    });

    // Create the OTP token record
    await prisma.otpToken.create({
      data: {
        email: user.email,
        otp,
        purpose: "RESET_PIN",
        expiresAt,
      },
    });

    // Dispatch the email
    const emailResult = await sendPinResetEmail(user.email, otp);
    if (!emailResult.success) {
      return NextResponse.json(
        { error: "Failed to dispatch verification email. Try again later." },
        { status: 500 }
      );
    }

    // Mask user email for front-end notification (e.g. jo***@domain.com)
    const [mailbox, domain] = user.email.split("@");
    const maskedEmail = mailbox.length > 2
      ? `${mailbox.slice(0, 2)}***@${domain}`
      : `***@${domain}`;

    return NextResponse.json(
      {
        success: true,
        message: `Verification code sent to ${maskedEmail}`,
        email: maskedEmail,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[FORGOT PIN SEND ERROR]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
