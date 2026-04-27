import { prisma } from "@/lib/db";
import { evaluateDepositRewardInTx } from "@/lib/rewards";
import { processBillstackWebhookWithAdapter } from "@/lib/billstack-webhook-core.mjs";

type RawPayload = Record<string, unknown>;

function sanitizeReferencePart(value: string | null | undefined) {
  return String(value || "")
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 48);
}

function buildFundingReference(input: { interbankReference?: string | null; transactionReference?: string | null }) {
  const stable = sanitizeReferencePart(input.interbankReference) || sanitizeReferencePart(input.transactionReference);
  if (!stable) return `BILLSTACK-${Date.now()}`;
  return `BILLSTACK-${stable}`;
}

export async function processBillstackWebhook(payload: RawPayload) {
  return prisma.$transaction(async (tx) => {
    return processBillstackWebhookWithAdapter(payload, {
      findProcessedEvent: async ({
        transactionReference,
        interbankReference,
      }: {
        transactionReference?: string | null;
        interbankReference?: string | null;
      }) => {
        if (!transactionReference && !interbankReference) return null;
        const candidates = await tx.paymentWebhookEvent.findMany({
          where: {
            provider: "BILLSTACK",
            OR: [
              ...(transactionReference ? [{ transactionReference }] : []),
              ...(interbankReference ? [{ interbankReference }] : []),
            ],
          },
          orderBy: { createdAt: "desc" },
          take: 1,
        });
        const hit = candidates[0];
        if (!hit || hit.status !== "PROCESSED") return null;
        return { id: hit.id, transactionId: hit.transactionId };
      },
      resolveAccount: async ({
        merchantReference,
        accountNumber,
      }: {
        merchantReference?: string | null;
        accountNumber?: string | null;
      }) => {
        const bankAccount = await tx.userBankAccount.findFirst({
          where: {
            OR: [
              ...(merchantReference ? [{ merchantReference }] : []),
              ...(accountNumber ? [{ accountNumber }] : []),
            ],
          },
          select: { userId: true },
        });
        if (bankAccount) return { userId: bankAccount.userId };

        const legacy = await tx.virtualAccount.findFirst({
          where: {
            OR: [
              ...(merchantReference ? [{ orderRef: merchantReference }] : []),
              ...(accountNumber ? [{ accountNumber }] : []),
            ],
          },
          select: { userId: true },
        });
        return legacy ? { userId: legacy.userId } : null;
      },
      withLock: async (lockKey: string, fn: () => Promise<unknown>) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;
        return fn();
      },
      recordReceived: async (normalizedPayload: {
        event: string;
        transactionReference?: string | null;
        interbankReference?: string | null;
        merchantReference?: string | null;
        amountNaira: number;
        raw: unknown;
      }) => {
        const event = await tx.paymentWebhookEvent.create({
          data: {
            provider: "BILLSTACK",
            eventType: normalizedPayload.event,
            transactionReference: normalizedPayload.transactionReference || undefined,
            interbankReference: normalizedPayload.interbankReference || undefined,
            merchantReference: normalizedPayload.merchantReference || undefined,
            amount: normalizedPayload.amountNaira,
            payload: normalizedPayload.raw as object,
            status: "RECEIVED",
          },
          select: { id: true },
        });
        return event.id;
      },
      creditWallet: async ({
        userId,
        amountNaira,
        transactionReference,
        interbankReference,
      }: {
        userId: string;
        amountNaira: number;
        transactionReference?: string | null;
        interbankReference?: string | null;
      }) => {
        const user = await tx.user.findUnique({
          where: { id: userId },
          select: { id: true, phone: true, balance: true },
        });

        if (!user) {
          throw new Error("Webhook user not found");
        }

        const amountKobo = Math.round(amountNaira * 100);
        const updatedUser = await tx.user.update({
          where: { id: user.id },
          data: { balance: { increment: amountKobo } },
          select: { balance: true },
        });

        const createdTx = await tx.transaction.create({
          data: {
            userId: user.id,
            phone: user.phone,
            type: "WALLET_FUNDING",
            status: "SUCCESS",
            amount: amountNaira,
            reference: buildFundingReference({ interbankReference, transactionReference }),
            externalReference: interbankReference || transactionReference || undefined,
            flwRef: transactionReference || undefined,
            description: "Wallet funding via Billstack webhook",
            balanceBefore: user.balance,
            balanceAfter: updatedUser.balance,
          },
          select: { id: true },
        });

        await evaluateDepositRewardInTx(tx, {
          userId: user.id,
          phone: user.phone,
          depositAmount: amountNaira,
        });

        return {
          transactionId: createdTx.id,
          balanceAfter: updatedUser.balance,
        };
      },
      markProcessed: async (eventId: string, transactionId: string) => {
        await tx.paymentWebhookEvent.update({
          where: { id: eventId },
          data: {
            status: "PROCESSED",
            processedAt: new Date(),
            transactionId,
          },
        });
      },
    });
  });
}
