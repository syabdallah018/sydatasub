import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import bcryptjs from "bcryptjs";
import { z } from "zod";
import { rejectCrossSiteMutation } from "@/lib/security";

const changeSchema = z.object({
  currentPin: z.string().regex(/^\d{6}$/, "Invalid current PIN format"),
  newPin: z.string().regex(/^\d{6}$/, "Invalid new PIN format"),
  confirmPin: z.string().regex(/^\d{6}$/, "Invalid confirm PIN format"),
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
    const { currentPin, newPin, confirmPin } = changeSchema.parse(body);

    // Validate new PIN matches confirmation
    if (newPin !== confirmPin) {
      return NextResponse.json(
        { error: "New PIN and confirmation do not match" },
        { status: 400 }
      );
    }

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

    // Verify current PIN
    if (!userData.pinHash) {
      return NextResponse.json(
        { error: "PIN not set" },
        { status: 400 }
      );
    }

    const isPinValid = await bcryptjs.compare(currentPin, userData.pinHash);
    if (!isPinValid) {
      return NextResponse.json(
        { error: "Current PIN is incorrect" },
        { status: 401 }
      );
    }

    // Prevent using same PIN
    const isSamePin = await bcryptjs.compare(newPin, userData.pinHash);
    if (isSamePin) {
      return NextResponse.json(
        { error: "New PIN must be different from current PIN" },
        { status: 400 }
      );
    }

    // Hash new PIN and update
    const hashedPin = await bcryptjs.hash(newPin, 10);
    await prisma.user.update({
      where: { id: user.userId },
      data: { pinHash: hashedPin },
    });

    return NextResponse.json(
      {
        success: true,
        message: "PIN changed successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[CHANGE PIN ERROR]", error);
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
