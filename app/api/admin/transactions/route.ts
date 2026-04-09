import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { prisma } from "@/lib/db";

/**
 * GET /api/admin/transactions
 * Returns paginated, filtered transactions
 * Query params: status, type, startDate, endDate, page, limit
 */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const type = searchParams.get("type");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    if (status && status !== "ALL") {
      where.status = status;
    }

    if (type && type !== "ALL") {
      where.type = type;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    // Get total count
    const totalCount = await prisma.transaction.count({ where });

    // Get paginated results
    const transactions = await prisma.transaction.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        reference: true,
        type: true,
        status: true,
        amount: true,
        phone: true,
        description: true,
        apiUsed: true,
        createdAt: true,
        user: {
          select: {
            fullName: true,
            phone: true,
          },
        },
        plan: {
          select: {
            name: true,
          },
        },
      },
    });

    // Format response
    const formattedTransactions = transactions.map((tx) => ({
      ...tx,
      userName: tx.user?.fullName || "Guest",
      planName: tx.plan?.name || "N/A",
    }));

    return NextResponse.json(
      {
        transactions: formattedTransactions,
        pagination: {
          page,
          limit,
          total: totalCount,
          pages: Math.ceil(totalCount / limit),
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("[GET TRANSACTIONS ERROR]", error);

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
