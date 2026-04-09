import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createDynamicVirtualAccount } from "@/lib/flutterwave";
import { z } from "zod";

const createTempAccountSchema = z.object({
  amount: z.number().min(50, "Minimum amount is ₦50").max(150000, "Maximum amount is ₦150,000"),
  phone: z.string().regex(/^0[0-9]{10}$/, "Invalid phone number"),
  planId: z.string().min(1, "Plan ID is required"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { amount, phone, planId } = createTempAccountSchema.parse(body);

    // Check if plan exists
    const plan = await prisma.plan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      return NextResponse.json(
        { error: "Plan not found" },
        { status: 404 }
      );
    }

    // Generate unique reference for this guest transaction
    const reference = `SYDATA-GUEST-${planId.slice(0, 8)}-${Date.now()}`;

    // Extract firstname/lastname from phone (will use default names for guest)
    // In production, you could ask for guest name via frontend
    const firstName = "Guest";
    const lastName = phone.slice(-4); // Use last 4 digits as surname

    try {
      // Create dynamic virtual account with Flutterwave
      const flwResponse = await createDynamicVirtualAccount({
        email: `guest-${reference}@sydata.ng`,
        firstname: firstName,
        lastname: lastName,
        phone,
        tx_ref: reference,
        amount, // The amount customer needs to send
        narration: `SY DATA - ${plan.sizeLabel} for ${phone}`,
      });

      // Create transaction record with pending status
      const transaction = await prisma.transaction.create({
        data: {
          type: "DATA_PURCHASE",
          status: "PENDING",
          reference,
          phone,
          planId,
          amount, // Store in naira
          tempAccountNumber: flwResponse.account_number,
          tempBankName: flwResponse.bank_name,
          tempTxRef: flwResponse.flw_ref,
          description: `Data purchase: ${plan.sizeLabel} for ${phone}`,
        },
      });

      // Return account details to frontend for payment
      return NextResponse.json(
        {
          success: true,
          accountNumber: flwResponse.account_number,
          bankName: flwResponse.bank_name,
          amount,
          reference,
          bankInstruction: `Transfer exactly ₦${amount} to ${flwResponse.account_number} (${flwResponse.bank_name})`,
          transactionId: transaction.id,
        },
        { status: 201 }
      );
    } catch (flwError: any) {
      console.error("[FLUTTERWAVE CREATE VA ERROR]", flwError.message);

      return NextResponse.json(
        { error: flwError.message || "Failed to create virtual account" },
        { status: 502 }
      );
    }
  } catch (error) {
    console.error("[CREATE TEMP ACCOUNT ERROR]", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
