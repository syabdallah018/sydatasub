import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET(req: NextRequest) {
  try {
    const userId = req.cookies.get("sy_session")?.value
    if (!userId) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        phone: true,
        role: true,
        tier: true,
        balance: true,
        rewardBalance: true,
        agentRequestStatus: true,
        isBanned: true,
        isActive: true,
        joinedAt: true,
        virtualAccount: {
          select: { accountNumber: true, bankName: true, flwRef: true }
        },
      },
    })

    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 })
    }

    if (user.isBanned) {
      return NextResponse.json({ success: false, error: "Account suspended" }, { status: 403 })
    }

    return NextResponse.json({ success: true, data: user })
  } catch (error) {
    console.error("[me]", error)
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 })
  }
}
