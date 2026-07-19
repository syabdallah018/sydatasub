import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const { id } = params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, fullName: true },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        kycLocked: false,
        kycLockReason: null,
        kycLockedAt: null,
      },
    });

    console.log(`[ADMIN UNLOCKED KYC] User ID: ${id}, Name: ${user.fullName}`);

    return NextResponse.json({ success: true, user: updatedUser }, { status: 200 });
  } catch (error) {
    console.error("[ADMIN KYC UNLOCK ERROR]", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
