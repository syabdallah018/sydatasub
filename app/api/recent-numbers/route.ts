import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser(req);
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const recentTransactions = await prisma.transaction.findMany({
      where: {
        userId: sessionUser.userId,
        status: { in: ["SUCCESS", "PENDING"] },
        phone: { not: null },
      },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        phone: true,
        createdAt: true,
      },
    });

    const uniquePhones: string[] = [];
    for (const tx of recentTransactions) {
      if (tx.phone && /^0[0-9]{10}$/.test(tx.phone) && !uniquePhones.includes(tx.phone)) {
        uniquePhones.push(tx.phone);
        if (uniquePhones.length >= 3) break;
      }
    }

    return NextResponse.json({ success: true, recentNumbers: uniquePhones }, { status: 200 });
  } catch (error) {
    console.error("[RECENT NUMBERS ERROR]", error);
    return NextResponse.json({ error: "Failed to fetch recent numbers" }, { status: 500 });
  }
}
