import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { verifyToken } from "@/lib/auth"

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("sy_session")?.value
    if (!token) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload || !payload.userId) {
      return NextResponse.json({ success: false, error: "Invalid session" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId as string },
      select: {
        id: true,
        fullName: true,
        phone: true,
        role: true,
        balance: true,
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
