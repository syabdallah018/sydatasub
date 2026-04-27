import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import bcryptjs from "bcryptjs";
import { z } from "zod";
import { rejectCrossSiteMutation } from "@/lib/security";

const verifySchema = z.object({
  pin: z.string().regex(/^\d{6}$/, "Invalid PIN format"),
});

export async function POST(req: NextRequest) {
  try {
    const originError = rejectCrossSiteMutation(req, { requireOrigin: true });
    if (originError) return originError;

    const user = await getSessionUser(req);

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { pin } = verifySchema.parse(body);

    // Get user data
    const userData = await prisma.user.findUnique({
      where: { id: user.userId },
    });

    if (!userData) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Verify PIN
    if (!userData.pinHash) {
      return NextResponse.json(
        { error: "PIN not set" },
        { status: 400 }
      );
    }

    const isPinValid = await bcryptjs.compare(pin, userData.pinHash);

    return NextResponse.json(
      {
        valid: isPinValid,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[VERIFY PIN ERROR]", error);
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
