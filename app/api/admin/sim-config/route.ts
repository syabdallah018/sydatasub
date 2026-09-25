import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { prisma } from "@/lib/db";
import { SIM_CONFIG_PREFIX, TIMEOUT_PREFIX } from "@/lib/purchase-utils";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);

    // Common inclusion for transactions
    const transactionInclude = {
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
    };

    // 1. Fetch queued SIM config data purchases (excluding timeout-specific entries)
    const simConfigTransactions = await prisma.transaction.findMany({
      where: {
        status: "PENDING",
        type: "DATA_PURCHASE",
        AND: [
          { NOT: { description: { startsWith: TIMEOUT_PREFIX } } },
          {
            OR: [
              { description: { startsWith: SIM_CONFIG_PREFIX } },
              { description: { contains: "sim", mode: "insensitive" } },
              { description: { contains: "dispense", mode: "insensitive" } },
            ],
          },
        ],
      },
      orderBy: { createdAt: "desc" },
      include: transactionInclude,
      take: 100,
    });

    // 2. Fetch Timeout Queue (Data & Airtime transactions with timeout indicator)
    const timeoutTransactions = await prisma.transaction.findMany({
      where: {
        status: "PENDING",
        OR: [
          { description: { startsWith: TIMEOUT_PREFIX } },
          { description: { contains: "timeout", mode: "insensitive" } },
          { description: { contains: "timed out", mode: "insensitive" } },
          { description: { contains: "gateway timeout", mode: "insensitive" } },
          { description: { contains: "in flight", mode: "insensitive" } },
        ],
      },
      orderBy: { createdAt: "desc" },
      include: transactionInclude,
      take: 100,
    });

    // 3. Fetch Airtime Queue (Pending Airtime purchases not already in timeout queue)
    const airtimeTransactions = await prisma.transaction.findMany({
      where: {
        status: "PENDING",
        type: "AIRTIME_PURCHASE",
        NOT: { description: { startsWith: TIMEOUT_PREFIX } },
      },
      orderBy: { createdAt: "desc" },
      include: transactionInclude,
      take: 100,
    });

    // Compute summaries
    const simCount = simConfigTransactions.length;
    const simAmount = simConfigTransactions.reduce((acc, tx) => acc + (tx.amount || 0), 0);

    const timeoutCount = timeoutTransactions.length;
    const timeoutAmount = timeoutTransactions.reduce((acc, tx) => acc + (tx.amount || 0), 0);

    const airtimeCount = airtimeTransactions.length;
    const airtimeAmount = airtimeTransactions.reduce((acc, tx) => acc + (tx.amount || 0), 0);

    const totalQueuedCount = simCount + timeoutCount + airtimeCount;
    const totalQueuedAmount = simAmount + timeoutAmount + airtimeAmount;

    const networkBreakdown: Record<string, number> = {};
    const providerBreakdown: Record<string, number> = {};

    const allQueued = [...simConfigTransactions, ...timeoutTransactions, ...airtimeTransactions];
    for (const tx of allQueued) {
      const net = tx.plan?.network || "OTHER";
      networkBreakdown[net] = (networkBreakdown[net] || 0) + 1;

      const prov = tx.apiUsed || tx.plan?.apiSource || "UNKNOWN";
      providerBreakdown[prov] = (providerBreakdown[prov] || 0) + 1;
    }

    return NextResponse.json({
      success: true,
      data: {
        // queuedTransactions provides backward compatibility for existing consumer
        queuedTransactions: simConfigTransactions,
        simConfigTransactions,
        timeoutTransactions,
        airtimeTransactions,
        summary: {
          simCount,
          simAmount,
          timeoutCount,
          timeoutAmount,
          airtimeCount,
          airtimeAmount,
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
