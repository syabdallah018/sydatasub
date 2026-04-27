import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createDynamicVirtualAccount } from "@/lib/flutterwave";
import { getPlanPriceForUser } from "@/lib/pricing";
import { z } from "zod";
import { enforceRateLimit, rejectCrossSiteMutation } from "@/lib/security";

const createTempAccountSchema = z.object({
  phone: z.string().regex(/^0[0-9]{10}$/, "Invalid phone number"),
  planId: z.string().min(1, "Plan ID is required"),
});

export async function POST(req: NextRequest) {
  try {
    const originError = rejectCrossSiteMutation(req, { requireOrigin: true });
    if (originError) return originError;

    const rateLimitError = enforceRateLimit(req, "dataPurchase", "guest-temp-account");
    if (rateLimitError) return rateLimitError;

    const body = await req.json();
    const { phone, planId } = createTempAccountSchema.parse(body);

    const plan = await prisma.plan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    const amount = getPlanPriceForUser(plan, { tier: "user" });
    const reference = `SYDATA-GUEST-${planId.slice(0, 8)}-${Date.now()}`;
    const firstName = "Guest";
    const lastName = phone.slice(-4);

    try {
      const flwResponse = await createDynamicVirtualAccount({
        email: `guest-${reference}@sydata.ng`,
        firstname: firstName,
        lastname: lastName,
        phone,
        tx_ref: reference,
        amount,
        narration: `SY DATA - ${plan.sizeLabel} for ${phone}`,
      });

      const transaction = await prisma.transaction.create({
        data: {
          type: "DATA_PURCHASE",
          status: "PENDING",
          reference,
          phone,
          planId,
          amount,
          tempAccountNumber: flwResponse.account_number,
          tempBankName: flwResponse.bank_name,
          tempTxRef: flwResponse.flw_ref,
          description: `Data purchase: ${plan.sizeLabel} for ${phone}`,
        },
      });

      return NextResponse.json(
        {
          success: true,
          accountNumber: flwResponse.account_number,
          bankName: flwResponse.bank_name,
          amount,
          reference,
          bankInstruction: `Transfer exactly N${amount} to ${flwResponse.account_number} (${flwResponse.bank_name})`,
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

    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
