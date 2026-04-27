import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { purchaseAirtime } from "@/lib/smeplug";
import { findRecentDuplicateTransaction, normalizeProviderFailureMessage } from "@/lib/purchase-utils";
import { getSessionUser } from "@/lib/auth";
import { z } from "zod";
import bcryptjs from "bcryptjs";
import { enforceRateLimit, rejectCrossSiteMutation } from "@/lib/security";

const purchaseSchema = z.object({
  buyerPhone: z.string().regex(/^0[0-9]{10}$/, "Invalid buyer phone"),
  recipientPhone: z.string().regex(/^0[0-9]{10}$/, "Invalid recipient phone number"),
  amount: z.number().min(50, "Minimum amount is N50").max(50000, "Maximum amount is N50,000"),
  network: z.string().min(1, "Select network"),
  pin: z.string().regex(/^\d{6}$/, "Invalid PIN"),
  confirmDuplicate: z.boolean().optional(),
});

const networkIds: Record<string, number> = {
  mtn: 1,
  glo: 2,
  "9mobile": 3,
  airtel: 4,
};

export async function POST(req: NextRequest) {
  try {
    const originError = rejectCrossSiteMutation(req, { requireOrigin: true });
    if (originError) return originError;

    const rateLimitError = enforceRateLimit(req, "airtimePurchase");
    if (rateLimitError) return rateLimitError;

    const body = await req.json();
    const {
      buyerPhone,
      recipientPhone,
      amount,
      network,
      pin,
      confirmDuplicate = false,
    } = purchaseSchema.parse(body);

    const sessionUser = await getSessionUser(req);
    if (!sessionUser) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: sessionUser.userId },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    if (user.phone !== buyerPhone) {
      return NextResponse.json({ success: false, error: "Session mismatch detected" }, { status: 403 });
    }

    if (user.isBanned) {
      return NextResponse.json({ success: false, error: "Account is banned" }, { status: 403 });
    }

    if (!user.pinHash) {
      return NextResponse.json({ success: false, error: "PIN not set" }, { status: 400 });
    }

    const isPinValid = await bcryptjs.compare(pin, user.pinHash);
    if (!isPinValid) {
      return NextResponse.json({ success: false, error: "Invalid PIN" }, { status: 401 });
    }

    const amountInKobo = amount * 100;
    if (user.balance < amountInKobo) {
      return NextResponse.json({ success: false, error: "Insufficient balance" }, { status: 400 });
    }

    const duplicateTransaction = await findRecentDuplicateTransaction({
      userId: user.id,
      type: "AIRTIME_PURCHASE",
      phone: recipientPhone,
      amount,
    });

    if (duplicateTransaction && !confirmDuplicate) {
      return NextResponse.json(
        {
          success: false,
          error: "Duplicate transaction detected. Confirm to continue.",
          requiresConfirmation: true,
          duplicateTransaction,
        },
        { status: 409 }
      );
    }

    const reference = `AIRTIME-${user.id}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { balance: { decrement: amountInKobo } },
      });

      await tx.transaction.create({
        data: {
          userId: user.id,
          type: "AIRTIME_PURCHASE",
          amount,
          status: "PENDING",
          reference,
          description: `Airtime: N${amount} to ${recipientPhone}`,
          phone: recipientPhone,
          apiUsed: "API_A",
          balanceBefore: user.balance,
          balanceAfter: user.balance - amountInKobo,
        },
      });
    });

    try {
      const apiResult = await purchaseAirtime({
        networkId: networkIds[network.toLowerCase()] || 1,
        amount,
        phone: recipientPhone,
        reference,
      });

      if (!apiResult.success) {
        const errorMessage = normalizeProviderFailureMessage(apiResult.message);

        await prisma.$transaction(async (tx) => {
          await tx.user.update({
            where: { id: user.id },
            data: { balance: { increment: amountInKobo } },
          });

          await tx.transaction.updateMany({
            where: { reference },
            data: {
              status: "FAILED",
              description: errorMessage,
              externalReference: apiResult.externalReference || undefined,
            },
          });
        });

        return NextResponse.json({ success: false, error: errorMessage }, { status: 400 });
      }

      await prisma.transaction.updateMany({
        where: { reference },
        data: {
          status: "SUCCESS",
          externalReference: apiResult.externalReference || undefined,
          description: apiResult.message,
        },
      });

      return NextResponse.json(
        {
          success: true,
          message: apiResult.message || "Airtime purchased successfully",
          reference,
        },
        { status: 200 }
      );
    } catch (error) {
      console.error("[AIRTIME PURCHASE API ERROR]", error);

      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: user.id },
          data: { balance: { increment: amountInKobo } },
        });

        await tx.transaction.updateMany({
          where: { reference },
          data: {
            status: "FAILED",
            description: "Purchase failed. Balance refunded.",
          },
        });
      });

      return NextResponse.json(
        { success: false, error: "Purchase failed. Balance refunded." },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("[AIRTIME PURCHASE ERROR]", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.issues[0].message },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
