import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createFlutterwaveVirtualAccount } from "@/lib/flutterwave";
import { rejectCrossSiteMutation } from "@/lib/security";

export async function POST(req: NextRequest) {
  try {
    const originError = rejectCrossSiteMutation(req, { requireOrigin: true });
    if (originError) return originError;

    const user = await getSessionUser(req);

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userData = await prisma.user.findUnique({
      where: { id: user.userId },
    });

    if (!userData) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const existingAccount = await prisma.virtualAccount.findUnique({
      where: { userId: user.userId },
    });

    if (existingAccount) {
      return NextResponse.json(existingAccount, { status: 200 });
    }

    // Create virtual account via Flutterwave
    const virtualAccount = await createFlutterwaveVirtualAccount({
      userId: user.userId,
      email: userData.email ?? "",
      firstName: userData.fullName?.split(" ")[0] || "User",
      lastName: userData.fullName?.split(" ")[1] || "",
      phone: userData.phone,
    });

    // Store virtual account in database
    const vAccount = await prisma.virtualAccount.create({
      data: {
        userId: user.userId,
        accountNumber: virtualAccount.account_number,
        bankName: virtualAccount.bank_name,
        flwRef: virtualAccount.flw_ref || `SYDATA-VA-${user.userId}-${Date.now()}`,
        orderRef: virtualAccount.order_ref || virtualAccount.tx_ref || userData.id,
      },
    });

    return NextResponse.json(vAccount, { status: 201 });
  } catch (error) {
    console.error("[VIRTUAL ACCOUNT ERROR]", error);
    return NextResponse.json(
      { error: "Failed to create virtual account" },
      { status: 500 }
    );
  }
}
