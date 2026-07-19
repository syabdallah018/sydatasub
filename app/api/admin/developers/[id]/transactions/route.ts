import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const { id } = params;

    // Fetch the developer profile to get the associated userId
    const profile = await prisma.developerProfile.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!profile) {
      return NextResponse.json({ success: false, error: "Developer profile not found" }, { status: 404 });
    }

    // Fetch transactions for this user
    const transactions = await prisma.transaction.findMany({
      where: { userId: profile.userId },
      select: {
        id: true,
        reference: true,
        type: true,
        status: true,
        amount: true,
        phone: true,
        description: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Format amounts to Naira from Kobo if stored in Kobo, wait
    // Transactions table amount is in Float or Int? In our codebase, transaction amount is stored in Naira (e.g. 240) in db?
    // Let's check: in purchase/route.ts, `amount: planPrice` is logged. `planPrice` is in Naira, so `amount` is in Naira!
    // But user wallet balance is in Kobo. So amount in transactions is already in Naira. Correct.

    return NextResponse.json({ success: true, transactions }, { status: 200 });
  } catch (error) {
    console.error("[ADMIN GET DEV TRANSACTIONS ERROR]", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
