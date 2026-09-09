import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser(req);
    if (!sessionUser) {
      return NextResponse.json(
        { success: false, error: "Your session has expired. Please log in again to continue." },
        { status: 401 }
      );
    }

    const recentTransactions = await prisma.transaction.findMany({
      where: {
        userId: sessionUser.userId,
        status: { in: ["SUCCESS", "PENDING"] },
        phone: { not: "" },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        phone: true,
        type: true,
        createdAt: true,
        plan: {
          select: {
            network: true,
          },
        },
      },
    });

    const uniquePhones: string[] = [];
    const recents: Array<{
      phone: string;
      network: string | null;
      lastUsed: string;
      type: string;
    }> = [];

    for (const tx of recentTransactions) {
      if (tx.phone && /^0[0-9]{10}$/.test(tx.phone) && !uniquePhones.includes(tx.phone)) {
        uniquePhones.push(tx.phone);
        recents.push({
          phone: tx.phone,
          network: tx.plan?.network ? String(tx.plan.network) : null,
          lastUsed: tx.createdAt.toISOString(),
          type: tx.type,
        });
        if (uniquePhones.length >= 30) break;
      }
    }

    return NextResponse.json(
      { success: true, recentNumbers: uniquePhones, recents },
      { status: 200 }
    );
  } catch (error) {
    console.error("[RECENT NUMBERS ERROR]", error);
    return NextResponse.json({ error: "Failed to fetch recent numbers" }, { status: 500 });
  }
}
