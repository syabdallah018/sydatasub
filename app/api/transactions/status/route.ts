import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * GET /api/transactions/status?ref={reference}
 *
 * Returns transaction status for frontend polling
 * Used by guest flow to check payment status every 15 seconds
 * Returns: { status: "PENDING" | "SUCCESS" | "FAILED", description? }
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const reference = searchParams.get("ref");

    if (!reference) {
      return NextResponse.json(
        { error: "Reference parameter is required" },
        { status: 400 }
      );
    }

    // Find transaction by reference
    const transaction = await prisma.transaction.findFirst({
      where: { reference },
      select: {
        id: true,
        status: true,
        description: true,
        amount: true,
        type: true,
        planId: true,
        plan: {
          select: {
            sizeLabel: true,
            network: true,
          },
        },
      },
    });

    if (!transaction) {
      return NextResponse.json(
        { status: "NOTFOUND", description: "Transaction not found" },
        { status: 404 }
      );
    }

    // Build response with status-specific details
    const response: any = {
      status: transaction.status,
      type: transaction.type,
    };

    // Add description if available
    if (transaction.description) {
      response.description = transaction.description;
    }

    // Add plan details for DATA_PURCHASE
    if (transaction.type === "DATA_PURCHASE" && transaction.plan) {
      response.planDetails = {
        size: transaction.plan.sizeLabel,
        network: transaction.plan.network,
      };
    }

    // Add amount for WALLET_FUNDING
    if (transaction.type === "WALLET_FUNDING") {
      response.amount = transaction.amount;
    }

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("[TRANSACTION STATUS ERROR]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}