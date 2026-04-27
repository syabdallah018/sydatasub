import assert from "node:assert/strict";
import { createReservedVirtualAccount, md5Hex, verifyBillstackSignature } from "../lib/billstack-core.mjs";
import { processBillstackWebhookWithAdapter } from "../lib/billstack-webhook-core.mjs";

async function testCreateReservedVirtualAccount() {
  let seenHeaders = null;
  const fetchImpl = async (_url, init) => {
    seenHeaders = init.headers;
    return new Response(
      JSON.stringify({
        status: true,
        message: "Account reserved",
        data: {
          reference: "R-123",
          account: [
            {
              account_number: "0000000000",
              account_name: "Alias-Ahmad Naziru",
              bank_name: "9PSB Bank",
              bank_id: "9PSB",
              created_at: "2024-04-02 05:47:42",
            },
          ],
        },
      }),
      { status: 200, headers: { "content-type": "application/json" } }
    );
  };

  const result = await createReservedVirtualAccount(
    {
      reference: "BS-VA-user-1",
      email: "user@example.com",
      firstName: "User",
      lastName: "One",
      phone: "09012345678",
      bank: "PALMPAY",
    },
    {
      config: {
        baseUrl: "https://api.billstack.co",
        secretKey: "secret_123",
        maxRetries: 0,
        timeoutMs: 2000,
      },
      fetchImpl,
    }
  );

  assert.equal(seenHeaders.Authorization, "Bearer secret_123");
  assert.equal(seenHeaders["Content-Type"], "application/json");
  assert.equal(result.accountNumber, "0000000000");
  assert.equal(result.providerReference, "R-123");
}

async function testWebhookSignatureAndIdempotency() {
  const secret = "my_secret_key";
  assert.equal(verifyBillstackSignature(md5Hex(secret), secret), true);
  assert.equal(verifyBillstackSignature("invalid", secret), false);

  const processed = new Map();
  const events = [];
  let walletBalance = 0;

  const adapter = {
    findProcessedEvent: async ({ transactionReference, interbankReference }) =>
      processed.get(`${transactionReference || ""}:${interbankReference || ""}`) || null,
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
    event: "PAYMENT_NOTIFICATION",
    data: {
      type: "RESERVED_ACCOUNT_TRANSACTION",
      reference: "trx-ref-001",
      merchant_reference: "BS-VA-user_1",
      wiaxy_ref: "wiaxy-ref-001",
      amount: "2500",
      account: { account_number: "0001112223" },
      payer: [],
    },
  };

  const first = await processBillstackWebhookWithAdapter(payload, adapter);
  assert.equal(first.status, "processed");
  const second = await processBillstackWebhookWithAdapter(payload, adapter);
  assert.equal(second.status, "duplicate");
}

async function main() {
  const tests = [
    ["BillStack create account client", testCreateReservedVirtualAccount],
    ["BillStack webhook signature + idempotency", testWebhookSignatureAndIdempotency],
  ];

  let passed = 0;
  for (const [name, fn] of tests) {
    try {
      await fn();
      passed += 1;
      console.log(`PASS: ${name}`);
    } catch (error) {
      console.error(`FAIL: ${name}`);
      console.error(error);
      process.exitCode = 1;
      return;
    }
  }

  console.log(`All tests passed (${passed}/${tests.length})`);
}

await main();
