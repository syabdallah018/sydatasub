import { NextRequest, NextResponse } from "next/server";
import { enforceAdminMutationGuard, requireAdmin } from "@/lib/adminAuth";
import { prisma } from "@/lib/db";
import bcryptjs from "bcryptjs";

/**
 * POST /api/admin/users/[id]/reset-pin - Reset user PIN to 000000
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const originError = enforceAdminMutationGuard(req);
    if (originError) return originError;

    await requireAdmin(req);

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, fullName: true, phone: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Hash the default PIN "000000"
    const defaultPin = "000000";
    const hashedPin = await bcryptjs.hash(defaultPin, 10);

    // Update user's PIN
    const updated = await prisma.user.update({
      where: { id },
      data: {
        pinHash: hashedPin,
      },
      select: {
        id: true,
        fullName: true,
        phone: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: `PIN reset for ${updated.fullName}. Default PIN is now 000000`,
        user: updated,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("[RESET PIN ERROR]", error);

    if (error.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error.message.includes("Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
