import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const cursor = searchParams.get("cursor");
    const limit = parseInt(searchParams.get("limit") || "10");

    const transactions = await prisma.transaction.findMany({
      where: { userId: user.userId },
      orderBy: { createdAt: "desc" },
      take: limit + 1, // Take one extra to check if there are more
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1, // Skip the cursor itself
      }),
    });

    const hasNextPage = transactions.length > limit;
    const transactionsToReturn = hasNextPage ? transactions.slice(0, -1) : transactions;
    const nextCursor = hasNextPage ? transactionsToReturn[transactionsToReturn.length - 1]?.id : null;

    return NextResponse.json(
      {
        transactions: transactionsToReturn,
        nextCursor,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[TRANSACTIONS ERROR]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
