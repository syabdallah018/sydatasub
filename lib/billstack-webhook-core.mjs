import { z } from "zod";

const webhookPayloadSchema = z.object({
  event: z.string(),
  data: z.object({
    type: z.string(),
    reference: z.string().optional().nullable(),
    merchant_reference: z.string().optional().nullable(),
    wiaxy_ref: z.string().optional().nullable(),
    amount: z.union([z.string(), z.number()]),
    created_at: z.string().optional().nullable(),
    account: z
      .object({
        account_number: z.string().optional().nullable(),
        account_name: z.string().optional().nullable(),
        bank_name: z.string().optional().nullable(),
        created_at: z.string().optional().nullable(),
      })
      .optional()
      .nullable(),
    payer: z
      .object({
        account_number: z.string().optional().nullable(),
        first_name: z.string().optional().nullable(),
        last_name: z.string().optional().nullable(),
        createdAt: z.string().optional().nullable(),
      })
      .optional()
      .nullable(),
  }),
});

function toAmountNaira(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Invalid payment amount in webhook payload");
  }
  return Math.round(amount);
}

export function normalizeBillstackWebhookPayload(input) {
  const payload = webhookPayloadSchema.parse(input);
  const transactionReference = payload.data.reference?.trim() || null;
  const merchantReference = payload.data.merchant_reference?.trim() || null;
  const interbankReference = payload.data.wiaxy_ref?.trim() || null;
  const accountNumber = payload.data.account?.account_number?.trim() || null;

  return {
    event: payload.event,
    type: payload.data.type,
    transactionReference,
    merchantReference,
    interbankReference,
    amountNaira: toAmountNaira(payload.data.amount),
    accountNumber,
    raw: payload,
  };
}

export async function processBillstackWebhookWithAdapter(payloadInput, adapter) {
  const payload = normalizeBillstackWebhookPayload(payloadInput);

  if (payload.event !== "PAYMENT_NOTIFIFICATION" || payload.type !== "RESERVED_ACCOUNT_TRANSACTION") {
    return { status: "ignored", reason: "unsupported_event", payload };
  }

  if (!payload.transactionReference && !payload.interbankReference) {
    return { status: "ignored", reason: "missing_reference", payload };
  }

  const existing = await adapter.findProcessedEvent({
    transactionReference: payload.transactionReference,
    interbankReference: payload.interbankReference,
  });

  if (existing) {
    return {
      status: "duplicate",
      reason: "already_processed",
      payload,
      transactionId: existing.transactionId || null,
    };
  }

  const account = await adapter.resolveAccount({
    merchantReference: payload.merchantReference,
    accountNumber: payload.accountNumber,
  });

  if (!account?.userId) {
    return { status: "ignored", reason: "account_not_found", payload };
  }

  const lockKey = `billstack:${payload.interbankReference || payload.transactionReference}`;
  return adapter.withLock(lockKey, async () => {
    const duplicateAfterLock = await adapter.findProcessedEvent({
      transactionReference: payload.transactionReference,
      interbankReference: payload.interbankReference,
    });

    if (duplicateAfterLock) {
      return {
        status: "duplicate",
        reason: "already_processed",
        payload,
        transactionId: duplicateAfterLock.transactionId || null,
      };
    }

    const eventId = await adapter.recordReceived(payload);
    const credited = await adapter.creditWallet({
      userId: account.userId,
      amountNaira: payload.amountNaira,
      transactionReference: payload.transactionReference,
      interbankReference: payload.interbankReference,
      merchantReference: payload.merchantReference,
      payload: payload.raw,
    });
    await adapter.markProcessed(eventId, credited.transactionId);

    return {
      status: "processed",
      reason: "credited",
      payload,
      transactionId: credited.transactionId,
      balanceAfter: credited.balanceAfter,
    };
  });
}

