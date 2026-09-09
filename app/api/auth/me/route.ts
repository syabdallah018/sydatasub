import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getSessionExpiration, getSessionUser, isMobileClient, setUserSessionCookie, signToken } from "@/lib/auth";
import { getUserSelectCompat, normalizeUserCompat, withCompatibleUserFields } from "@/lib/user-compat"

export async function GET(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser(req);
    if (!sessionUser) {
      return NextResponse.json(
        { success: false, error: "Your session has expired. Please log in again to continue." },
        { status: 401 }
      );
    }

    const compat = await getUserSelectCompat()

    const user = await prisma.user.findUnique({
      where: { id: sessionUser.userId },
      select: {
        id: true,
        fullName: true,
        phone: true,
        email: true,
        role: true,
        tier: true,
        balance: true,
        isBanned: true,
        isActive: true,
        joinedAt: true,
        ...withCompatibleUserFields({}, compat),
      },
    })

    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 })
    }

    if (user.isBanned) {
      return NextResponse.json({ success: false, error: "Account suspended" }, { status: 403 })
    }

    const normalizedUser = normalizeUserCompat(user)

    const isMobile = isMobileClient(req);
    const refreshedToken = await signToken(
      {
        userId: normalizedUser.id,
        email: normalizedUser.email || normalizedUser.phone,
        role: normalizedUser.role,
      },
      getSessionExpiration(req)
    );

    const response = NextResponse.json({
      success: true,
      data: normalizedUser,
      token: refreshedToken,
    });

    if (!isMobile) {
      setUserSessionCookie(response, refreshedToken);
    }

    return response;
  } catch (error) {
    console.error("[me]", error)
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 })
  }
}
