import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { prisma } from "@/lib/db";

/**
 * GET /api/admin/users - Get all users with details
 */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);

    const users = await prisma.user.findMany({
      select: {
        id: true,
        fullName: true,
        phone: true,
        email: true,
        role: true,
        tier: true,
        balance: true,
        isBanned: true,
        isActive: true,
        joinedAt: true,
        virtualAccount: {
          select: {
            accountNumber: true,
            bankName: true,
          },
        },
        _count: {
          select: { transactions: true },
        },
      },
      orderBy: { joinedAt: "desc" },
    });

    // Format response
    const formattedUsers = users.map((u) => ({
      id: u.id,
      fullName: u.fullName,
      phone: u.phone,
      email: u.email,
      role: u.role,
      tier: u.tier,
      balance: u.balance,
      isBanned: u.isBanned,
      isActive: u.isActive,
      joinedAt: u.joinedAt,
      accountNumber: u.virtualAccount?.accountNumber,
      bankName: u.virtualAccount?.bankName,
      transactionCount: u._count.transactions,
    }));

    return NextResponse.json(formattedUsers, { status: 200 });
  } catch (error: any) {
    console.error("[GET USERS ERROR]", error);

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
