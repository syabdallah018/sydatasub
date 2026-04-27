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

function extractEmbeddedUserId(value?: string | null) {
  const source = String(value || "");
  const patterns = [
    /SYDATA-VA-([a-z0-9]{20,40})-/i,
    /BS-VA-([a-z0-9]{20,40})-/i,
    /^cm[a-z0-9]{20,40}$/i,
  ];

  for (const re of patterns) {
    const match = source.match(re);
    if (!match) continue;
    const candidate = match[1] || match[0];
    if (candidate) return candidate;
  }

  return null;
}

function isMissingWebhookEventsTable(error: unknown) {
  if (typeof error !== "object" || error === null) return false;
  if (!("code" in error) || (error as { code?: string }).code !== "P2021") return false;
  const table = String((error as { meta?: { table?: string } }).meta?.table || "");
  return table.includes("payment_webhook_events");
}

export async function processBillstackWebhook(payload: RawPayload) {
  return prisma.$transaction(async (tx) => {
    let webhookEventStoreAvailable = true;

    return processBillstackWebhookWithAdapter(payload, {
      findProcessedEvent: async ({
        transactionReference,
        interbankReference,
      }: {
        transactionReference?: string | null;
        interbankReference?: string | null;
      }) => {
        if (!transactionReference && !interbankReference) return null;
        if (webhookEventStoreAvailable) {
          try {
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
            if (hit && hit.status === "PROCESSED") {
              return { id: hit.id, transactionId: hit.transactionId };
            }
          } catch (error) {
            if (isMissingWebhookEventsTable(error)) {
              webhookEventStoreAvailable = false;
            } else {
              throw error;
            }
          }
        }

        const existingFunding = await tx.transaction.findFirst({
          where: {
            type: "WALLET_FUNDING",
            status: "SUCCESS",
            OR: [
              ...(interbankReference ? [{ externalReference: interbankReference }] : []),
              ...(transactionReference ? [{ externalReference: transactionReference }] : []),
            ],
          },
          select: { id: true },
        });
        if (!existingFunding) return null;
        return { id: existingFunding.id, transactionId: existingFunding.id };
      },
      resolveAccount: async ({
        merchantReference,
        accountNumber,
        transactionReference,
      }: {
        merchantReference?: string | null;
        accountNumber?: string | null;
        transactionReference?: string | null;
      }) => {
        const clauses = [
          ...(merchantReference ? [{ merchantReference }] : []),
          ...(accountNumber ? [{ accountNumber }] : []),
        ];

        if (clauses.length > 0) {
          const bankAccount = await tx.userBankAccount.findFirst({
            where: { OR: clauses },
            select: { userId: true },
          });
          if (bankAccount) return { userId: bankAccount.userId };
        }

        const embeddedUserId =
          extractEmbeddedUserId(merchantReference) ||
          extractEmbeddedUserId(transactionReference);

        if (!embeddedUserId) return null;

        const user = await tx.user.findUnique({
          where: { id: embeddedUserId },
          select: { id: true },
        });

        return user ? { userId: user.id } : null;
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
        if (!webhookEventStoreAvailable) {
          return "billstack-event-store-unavailable";
        }
        try {
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
        } catch (error) {
          if (isMissingWebhookEventsTable(error)) {
            webhookEventStoreAvailable = false;
            return "billstack-event-store-unavailable";
          }
          throw error;
        }
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
        if (!webhookEventStoreAvailable || eventId === "billstack-event-store-unavailable") return;
        try {
          await tx.paymentWebhookEvent.update({
            where: { id: eventId },
            data: {
              status: "PROCESSED",
              processedAt: new Date(),
              transactionId,
            },
          });
        } catch (error) {
          if (!isMissingWebhookEventsTable(error)) {
            throw error;
          }
          webhookEventStoreAvailable = false;
        }
      },
    });
  });
}
