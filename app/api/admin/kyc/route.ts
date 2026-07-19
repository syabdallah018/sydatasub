import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const lockedUsers = await prisma.user.findMany({
      where: { kycLocked: true },
      select: {
        id: true,
        fullName: true,
        phone: true,
        email: true,
        balance: true,
        tier: true,
        kycLocked: true,
        kycLockReason: true,
        kycLockedAt: true,
        joinedAt: true,
      },
      orderBy: { kycLockedAt: "desc" },
    });

    return NextResponse.json({ success: true, users: lockedUsers }, { status: 200 });
  } catch (error) {
    console.error("[ADMIN GET LOCKED USERS ERROR]", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
