import test from "node:test";
import assert from "node:assert/strict";
import { verifyBillstackSignature, md5Hex } from "../lib/billstack-core.mjs";
import { processBillstackWebhookWithAdapter } from "../lib/billstack-webhook-core.mjs";

test("verifyBillstackSignature validates md5(secret)", () => {
  const secret = "my_secret_key";
  const signature = md5Hex(secret);

  assert.equal(verifyBillstackSignature(signature, secret), true);
  assert.equal(verifyBillstackSignature("invalid", secret), false);
  assert.equal(verifyBillstackSignature(signature, ""), false);
});

test("processBillstackWebhookWithAdapter processes once and dedupes duplicates", async () => {
  const processed = new Map();
  const events = [];
  let walletBalance = 0;

  const adapter = {
    findProcessedEvent: async ({ transactionReference, interbankReference }) => {
      const key = `${transactionReference || ""}:${interbankReference || ""}`;
      return processed.get(key) || null;
    },
    resolveAccount: async () => ({ userId: "user_1" }),
    withLock: async (_key, fn) => fn(),
    recordReceived: async (payload) => {
      events.push(payload);
      return `event_${events.length}`;
    },
    creditWallet: async ({ amountNaira, transactionReference, interbankReference }) => {
      walletBalance += amountNaira * 100;
      const key = `${transactionReference || ""}:${interbankReference || ""}`;
      const transactionId = `tx_${events.length}`;
      processed.set(key, { transactionId });
      return { transactionId, balanceAfter: walletBalance };
    },
    markProcessed: async () => undefined,
  };

  const payload = {
    event: "PAYMENT_NOTIFIFICATION",
    data: {
      type: "RESERVED_ACCOUNT_TRANSACTION",
      reference: "trx-ref-001",
      merchant_reference: "BS-VA-user_1",
      wiaxy_ref: "wiaxy-ref-001",
      amount: "2500",
      account: {
        account_number: "0001112223",
        account_name: "User One",
        bank_name: "9PSB Bank",
        created_at: "2024-04-02 05:47:42",
      },
      payer: {
        account_number: "1111111111",
        first_name: "Test",
        last_name: "Sender",
        createdAt: "2024-04-03 07:10:00",
      },
    },
  };

  const first = await processBillstackWebhookWithAdapter(payload, adapter);
  assert.equal(first.status, "processed");
  assert.equal(first.reason, "credited");

  const second = await processBillstackWebhookWithAdapter(payload, adapter);
  assert.equal(second.status, "duplicate");
  assert.equal(second.reason, "already_processed");
});

