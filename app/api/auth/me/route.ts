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

    const userData = await prisma.user.findUnique({
      where: { id: user.userId },
      select: {
        id: true,
        fullName: true,
        phone: true,
        role: true,
        balance: true,
        isBanned: true,
      },
    });

    if (!userData) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Fetch virtualAccount separately with error handling
    let virtualAccount = null;
    try {
      const va = await prisma.virtualAccount.findUnique({
        where: { userId: user.userId },
        select: {
          accountNumber: true,
          bankName: true,
        },
      });
      virtualAccount = va;
    } catch (error) {
      console.warn("[VIRTUAL ACCOUNT FETCH WARNING]", error);
      // Continue without virtual account
    }

    return NextResponse.json(
      {
        ...userData,
        virtualAccount: virtualAccount || null,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[AUTH ME ERROR]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
