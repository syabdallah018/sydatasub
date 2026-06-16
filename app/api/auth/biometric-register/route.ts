import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcryptjs from "bcryptjs";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";

const registerSchema = z.object({
  token: z.string().min(10, "Token must be a secure random token"),
  pin: z.string().regex(/^\d{6}$/, "PIN must be 6 digits"),
});

export async function POST(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser(req);
    if (!sessionUser) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { token, pin } = registerSchema.parse(body);

    const user = await prisma.user.findUnique({
      where: { id: sessionUser.userId },
      select: { id: true, pinHash: true },
    });

    if (!user || !user.pinHash) {
      return NextResponse.json({ success: false, error: "User or PIN configuration not found" }, { status: 400 });
    }

    const isPinValid = await bcryptjs.compare(pin, user.pinHash);
    if (!isPinValid) {
      return NextResponse.json({ success: false, error: "Invalid PIN" }, { status: 401 });
    }

    const tokenHash = await bcryptjs.hash(token, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        biometricTokenHash: tokenHash,
      },
    });

    return NextResponse.json({ success: true, message: "Biometrics registered successfully" });
  } catch (error) {
    console.error("[BIOMETRIC REGISTER ERROR]", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.issues[0].message }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
