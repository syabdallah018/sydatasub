import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getSessionUser } from "@/lib/auth";
import { getUserSelectCompat, normalizeUserCompat, withCompatibleUserFields } from "@/lib/user-compat"

export async function GET(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser(req);
    if (!sessionUser) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })
    }

    const compat = await getUserSelectCompat()

    const user = await prisma.user.findUnique({
      where: { id: sessionUser.userId },
      select: {
        id: true,
        fullName: true,
        phone: true,
        role: true,
        tier: true,
        balance: true,
        isBanned: true,
        isActive: true,
        joinedAt: true,
        ...withCompatibleUserFields({}, compat),
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

    return NextResponse.json({ success: true, data: normalizeUserCompat(user) })
  } catch (error) {
    console.error("[me]", error)
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 })
  }
}
