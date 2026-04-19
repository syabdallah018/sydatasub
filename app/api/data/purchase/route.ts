import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { purchaseData as purchaseFromSmeplug } from "@/lib/smeplug";
import { purchaseData as purchaseFromSaiful } from "@/lib/saiful";
import { findRecentDuplicateTransaction, normalizeProviderFailureMessage, DATA_INSUFFICIENT_FUNDS_MESSAGE } from "@/lib/purchase-utils";
import { getPlanPriceForUser } from "@/lib/pricing";
import { getSessionUser } from "@/lib/auth";
import bcryptjs from "bcryptjs";
import { z } from "zod";
import { enforceRateLimit, rejectCrossSiteMutation } from "@/lib/security";

const purchaseSchema = z.object({
  planId: z.string().min(1, "Plan ID is required"),
  buyerPhone: z.string().regex(/^0[0-9]{10}$/, "Invalid buyer phone number"),
  recipientPhone: z.string().regex(/^0[0-9]{10}$/, "Invalid recipient phone number"),
  pin: z.string().regex(/^\d{6}$/, "Invalid PIN"),
  confirmDuplicate: z.boolean().optional(),
});

const IDEMPOTENCY_WINDOW_MINUTES = 5;

async function acquirePurchaseLock(tx: any, lockKey: string) {
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;
}

export async function POST(req: NextRequest) {
  try {
    const originError = rejectCrossSiteMutation(req);
    if (originError) return originError;

    const rateLimitError = enforceRateLimit(req, "dataPurchase");
    if (rateLimitError) return rateLimitError;

    const body = await req.json();
    const { planId, buyerPhone, recipientPhone, pin, confirmDuplicate = false } =
      purchaseSchema.parse(body);
    const sessionUser = await getSessionUser(req);

    if (!sessionUser) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: sessionUser.userId },
      select: {
        id: true,
        phone: true,
        pinHash: true,
        isBanned: true,
        tier: true,
        balance: true,
      },
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

    const plan = await prisma.plan.findUnique({
      where: { id: planId },
    });

    if (!plan || !plan.isActive) {
      return NextResponse.json({ success: false, error: "Plan not found" }, { status: 404 });
    }

    const planPrice = getPlanPriceForUser(plan, user);
    const priceInKobo = planPrice * 100;

    if (user.balance < priceInKobo) {
      return NextResponse.json(
        { success: false, error: DATA_INSUFFICIENT_FUNDS_MESSAGE },
        { status: 400 }
      );
    }

    const duplicateTransaction = await findRecentDuplicateTransaction({
      userId: user.id,
      type: "DATA_PURCHASE",
      phone: recipientPhone,
      planId,
      amount: planPrice,
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

    const reference = `DATA-${user.id}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const lockKey = `data:${user.id}:${planId}:${recipientPhone}:${planPrice}`;
    const txResult = await prisma.$transaction(async (tx) => {
      await acquirePurchaseLock(tx, lockKey);

      const existingDuplicate = await tx.transaction.findFirst({
        where: {
          userId: user.id,
          type: "DATA_PURCHASE",
          phone: recipientPhone,
          amount: planPrice,
          planId,
          createdAt: {
            gte: new Date(Date.now() - IDEMPOTENCY_WINDOW_MINUTES * 60 * 1000),
          },
          status: { in: ["PENDING", "SUCCESS"] },
        },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          reference: true,
          status: true,
          amount: true,
          phone: true,
          createdAt: true,
          description: true,
        },
      });

      if (existingDuplicate?.status === "PENDING") {
        return {
          kind: "pending_duplicate" as const,
          duplicateTransaction: existingDuplicate,
        };
      }

      if (existingDuplicate && !confirmDuplicate) {
        return {
          kind: "needs_confirmation" as const,
          duplicateTransaction: existingDuplicate,
        };
      }

      const latestUser = await tx.user.findUnique({
        where: { id: user.id },
        select: { balance: true },
      });

      if (!latestUser || latestUser.balance < priceInKobo) {
        return { kind: "insufficient_funds" as const };
      }

      await tx.user.update({
        where: { id: user.id },
        data: {
          balance: { decrement: priceInKobo },
        },
      });

      await tx.transaction.create({
        data: {
          userId: user.id,
          type: "DATA_PURCHASE",
          amount: planPrice,
          status: "PENDING",
          reference,
          description: `${plan.name} (${plan.sizeLabel}) -> ${recipientPhone}`,
          phone: recipientPhone,
          planId,
          apiUsed: plan.apiSource,
          balanceBefore: latestUser.balance,
          balanceAfter: latestUser.balance - priceInKobo,
        },
      });

      return {
        kind: "created" as const,
      };
    });

    if (txResult.kind === "pending_duplicate") {
      return NextResponse.json(
        {
          success: false,
          error: "A similar data purchase is already processing.",
          requiresConfirmation: false,
          duplicateTransaction: txResult.duplicateTransaction,
        },
        { status: 409 }
      );
    }

    if (txResult.kind === "needs_confirmation") {
      return NextResponse.json(
        {
          success: false,
          error: "Duplicate transaction detected. Confirm to continue.",
          requiresConfirmation: true,
          duplicateTransaction: txResult.duplicateTransaction,
        },
        { status: 409 }
      );
    }

    if (txResult.kind === "insufficient_funds") {
      return NextResponse.json(
        { success: false, error: DATA_INSUFFICIENT_FUNDS_MESSAGE },
        { status: 400 }
      );
    }

    try {
      const apiResult =
        plan.apiSource === "API_A"
          ? await purchaseFromSmeplug({
              externalNetworkId: plan.externalNetworkId,
              externalPlanId: plan.externalPlanId,
              phone: recipientPhone,
              reference,
            })
          : await purchaseFromSaiful({
              plan: plan.externalPlanId,
              mobileNumber: recipientPhone,
              network: plan.network,
              reference,
            });

      if (!apiResult.success) {
        const errorMessage = normalizeProviderFailureMessage(apiResult.message);

        await prisma.$transaction(async (tx) => {
          await tx.user.update({
            where: { id: user.id },
            data: {
              balance: { increment: priceInKobo },
            },
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
          message: apiResult.message,
          reference,
          amountCharged: planPrice,
          walletUsed: priceInKobo / 100,
        },
        { status: 200 }
      );
    } catch (error) {
      console.error("[DATA PURCHASE API ERROR]", error);

      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: user.id },
          data: {
            balance: { increment: priceInKobo },
          },
        });

        await tx.transaction.updateMany({
          where: { reference },
          data: {
            status: "FAILED",
            description: "Purchase failed, balances refunded",
          },
        });
      });

      return NextResponse.json(
        { success: false, error: "Purchase failed, balances refunded" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("[DATA PURCHASE ERROR]", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.issues[0].message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
