import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { purchaseAirtime as purchaseAirtimeAlrahuz } from "@/lib/alrahuz.mjs";
import { purchaseAirtime as purchaseAirtimeSmeplug } from "@/lib/smeplug";
import { purchaseAirtime as purchaseAirtimeSaiful } from "@/lib/saiful";
import {
  findRecentDuplicateTransaction,
  normalizeProviderFailureMessage,
  AIRTIME_PURCHASE_SUCCESS_MESSAGE,
  PURCHASE_FAILED_GENERIC_MESSAGE,
} from "@/lib/purchase-utils";
import { getSessionUser } from "@/lib/auth";
import { z } from "zod";
import bcryptjs from "bcryptjs";
import { enforceRateLimit, rejectCrossSiteMutation } from "@/lib/security";
import { sendPushToUser } from "@/lib/push";

const purchaseSchema = z.object({
  buyerPhone: z.string().regex(/^0[0-9]{10}$/, "Invalid buyer phone"),
  recipientPhone: z.string().regex(/^0[0-9]{10}$/, "Invalid recipient phone number"),
  amount: z.number().min(50, "Minimum amount is N50").max(50000, "Maximum amount is N50,000"),
  network: z.string().min(1, "Select network").transform((value) => value.toLowerCase()),
  pin: z.string().regex(/^\d{6}$/, "Invalid PIN").optional(),
  biometricToken: z.string().optional(),
  confirmDuplicate: z.boolean().optional(),
}).refine((data) => data.pin || data.biometricToken, {
  message: "Either PIN or Biometric Token is required",
  path: ["pin"],
});

const networkIds: Record<string, number> = {
  mtn: 1,
  "9mobile": 3,
  airtel: 4,
  glo: 2,
};

const IDEMPOTENCY_WINDOW_MINUTES = 5;

async function acquirePurchaseLock(tx: any, lockKey: string) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;
}

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
      biometricToken,
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

    if (biometricToken) {
      if (!user.biometricTokenHash) {
        return NextResponse.json({ success: false, error: "Biometric authentication not registered" }, { status: 400 });
      }
      const isBiometricValid = await bcryptjs.compare(biometricToken, user.biometricTokenHash);
      if (!isBiometricValid) {
        return NextResponse.json({ success: false, error: "Biometric authentication failed" }, { status: 401 });
      }
    } else if (pin) {
      if (!user.pinHash) {
        return NextResponse.json({ success: false, error: "PIN not set" }, { status: 400 });
      }
      const isPinValid = await bcryptjs.compare(pin, user.pinHash);
      if (!isPinValid) {
        return NextResponse.json({ success: false, error: "Invalid PIN" }, { status: 401 });
      }
    } else {
      return NextResponse.json({ success: false, error: "Authentication credentials required" }, { status: 400 });
    }

    const networkId = networkIds[network];
    if (!networkId) {
      return NextResponse.json({ success: false, error: "Plan not available now, choose other plans!" }, { status: 400 });
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

    // Determine configured provider dynamically
    const alrahuzToken = process.env.ALRAHUZ_API_TOKEN || process.env.ALRAHUZ_TOKEN || process.env.ALRAHUZ_API_KEY;
    const isSmeplugConfigured = process.env.SMEPLUG_API_KEY && !process.env.SMEPLUG_API_KEY.includes("your-");
    const isSaifulConfigured = process.env.SAIFUL_API_KEY && !process.env.SAIFUL_API_KEY.includes("your-");

    let apiUsed: "API_A" | "API_B" | "API_C" | "API_D" = "API_C";
    if (alrahuzToken) {
      apiUsed = "API_C";
    } else if (isSmeplugConfigured) {
      apiUsed = "API_A";
    } else if (isSaifulConfigured) {
      apiUsed = "API_B";
    }

    const reference = `AIRTIME-${user.id}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const lockKey = `airtime:${user.id}:${recipientPhone}:${amount}:${network}`;

    const txResult = await prisma.$transaction(async (tx) => {
      await acquirePurchaseLock(tx, lockKey);

      const existingDuplicate = await tx.transaction.findFirst({
        where: {
          userId: user.id,
          type: "AIRTIME_PURCHASE",
          phone: recipientPhone,
          amount,
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
        return { kind: "pending_duplicate" as const, duplicateTransaction: existingDuplicate };
      }

      if (existingDuplicate && !confirmDuplicate) {
        return { kind: "needs_confirmation" as const, duplicateTransaction: existingDuplicate };
      }

      const latestUser = await tx.user.findUnique({
        where: { id: user.id },
        select: { balance: true },
      });

      if (!latestUser || latestUser.balance < amountInKobo) {
        return { kind: "insufficient_funds" as const };
      }

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
          apiUsed,
          balanceBefore: latestUser.balance,
          balanceAfter: latestUser.balance - amountInKobo,
        },
      });

      return { kind: "created" as const };
    });

    if (txResult.kind === "pending_duplicate") {
      return NextResponse.json(
        {
          success: false,
          error: "A similar airtime purchase is already processing.",
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
      return NextResponse.json({ success: false, error: "Insufficient balance" }, { status: 400 });
    }

    try {
      let apiResult;
      if (apiUsed === "API_C") {
        apiResult = await purchaseAirtimeAlrahuz({
          network: networkId,
          amount,
          phone: recipientPhone,
          reference,
        });
      } else if (apiUsed === "API_A") {
        apiResult = await purchaseAirtimeSmeplug({
          networkId,
          amount,
          phone: recipientPhone,
          reference,
        });
      } else {
        apiResult = await purchaseAirtimeSaiful({
          mobileNumber: recipientPhone,
          amount,
          network: networkId,
        });
      }

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

        return NextResponse.json({ success: false, error: PURCHASE_FAILED_GENERIC_MESSAGE }, { status: 400 });
      }

      await prisma.transaction.updateMany({
        where: { reference },
        data: {
          status: "SUCCESS",
          externalReference: apiResult.externalReference || undefined,
          description: apiResult.message,
        },
      });

      sendPushToUser(
        user.id,
        "Airtime Purchase Successful",
        `You have successfully purchased ₦${amount} airtime for ${recipientPhone}. Ref: ${reference}`
      ).catch(err => console.error("[PUSH ERROR] Purchase push failed:", err));

      return NextResponse.json(
        {
          success: true,
          message: AIRTIME_PURCHASE_SUCCESS_MESSAGE,
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
        { success: false, error: PURCHASE_FAILED_GENERIC_MESSAGE },
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
