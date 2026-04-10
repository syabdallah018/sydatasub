import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("sy_session")?.value
    console.log("[TRANSACTIONS API] Token received:", !!token);
    
    if (!token) {
      console.log("[TRANSACTIONS API] No token provided");
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })
    }

    // Token is just the user ID, not a JWT
    const userId = token
    console.log("[TRANSACTIONS API] User ID:", userId);
    
    if (!userId) {
      console.log("[TRANSACTIONS API] Invalid user ID");
      return NextResponse.json({ success: false, error: "Invalid session" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const cursor = searchParams.get("cursor")
    const limit = Math.min(Number(searchParams.get("limit") ?? "10"), 30)

    const transactions = await prisma.transaction.findMany({
      where: { userId },
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
      },
    })

    const hasMore = transactions.length > limit
    const items = hasMore ? transactions.slice(0, -1) : transactions
    const nextCursor = hasMore ? items[items.length - 1].id : null

    return NextResponse.json({ 
      success: true, 
      transactions: items, 
      nextCursor 
    })
  } catch (error) {
    console.error("[transactions]", error)
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 })
  }
}
