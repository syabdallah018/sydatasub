import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { prisma } from "@/lib/db";
import { SIM_CONFIG_PREFIX } from "@/lib/purchase-utils";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);

    // Fetch queued SIM config data purchases
    const queuedTransactions = await prisma.transaction.findMany({
      where: {
        status: "PENDING",
        type: "DATA_PURCHASE",
        OR: [
          { description: { startsWith: SIM_CONFIG_PREFIX } },
          { description: { contains: "sim", mode: "insensitive" } },
          { description: { contains: "dispense", mode: "insensitive" } },
        ],
      },
      orderBy: { createdAt: "desc" },
      include: {
        plan: {
          select: {
            id: true,
            name: true,
            network: true,
            category: true,
            sizeLabel: true,
            user_price: true,
            apiSource: true,
          },
        },
        user: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            email: true,
          },
        },
      },
      take: 100,
    });

    const totalQueuedCount = queuedTransactions.length;
    const totalQueuedAmount = queuedTransactions.reduce((acc, tx) => acc + (tx.amount || 0), 0);

    const networkBreakdown: Record<string, number> = {};
    const providerBreakdown: Record<string, number> = {};

    for (const tx of queuedTransactions) {
      const net = tx.plan?.network || "OTHER";
      networkBreakdown[net] = (networkBreakdown[net] || 0) + 1;

      const prov = tx.apiUsed || tx.plan?.apiSource || "UNKNOWN";
      providerBreakdown[prov] = (providerBreakdown[prov] || 0) + 1;
    }

    return NextResponse.json({
      success: true,
      data: {
        queuedTransactions,
        summary: {
          totalQueuedCount,
          totalQueuedAmount,
          networkBreakdown,
          providerBreakdown,
        },
      },
    });
  } catch (error: any) {
    console.error("[ADMIN SIM CONFIG GET ERROR]", error);
    if (error.message?.includes("Unauthorized")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
