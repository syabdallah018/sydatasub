import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getSessionUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser(req);
    if (!sessionUser) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const cursor = searchParams.get("cursor")
    const limit = Math.min(Number(searchParams.get("limit") ?? "10"), 30)

    const transactions = await prisma.transaction.findMany({
      where: { userId: sessionUser.userId },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        type: true,
        status: true,
        amount: true,
        description: true,
        phone: true,
        createdAt: true,
        reference: true,
        plan: {
          select: {
            name: true,
            network: true,
            sizeLabel: true,
            validity: true,
            category: true,
          },
        },
      },
    })

    const hasMore = transactions.length > limit;
    const items = hasMore ? transactions.slice(0, -1) : transactions;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    // Gatekeep: Sanitize descriptions so users never see provider low balance or internal errors
    const sanitizedItems = items.map((tx) => {
      let desc = tx.description || "";
      const lower = desc.toLowerCase();
      if (tx.status === "FAILED") {
        if (
          lower.includes("balance") ||
          lower.includes("insufficient") ||
          lower.includes("wallet") ||
          lower.includes("fund") ||
          lower.includes("sim") ||
          lower.includes("provider") ||
          lower.includes("gateway") ||
          lower.includes("api") ||
          lower.includes("smeplug") ||
          lower.includes("saiful") ||
          lower.includes("amysub") ||
          lower.includes("alrahuz")
        ) {
          if (tx.plan) {
            desc = `${tx.plan.network} ${tx.plan.sizeLabel} Data (${tx.plan.category})`;
          } else if (tx.type === "AIRTIME_PURCHASE") {
            desc = "Airtime Purchase";
          } else {
            desc = "Transaction Failed";
          }
        }
      }
      return {
        ...tx,
        description: desc,
      };
    });

    return NextResponse.json({ 
      success: true, 
      transactions: sanitizedItems, 
      nextCursor 
    });
  } catch (error) {
    console.error("[transactions]", error)
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 })
  }
}
