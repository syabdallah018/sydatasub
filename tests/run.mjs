import assert from "node:assert/strict";
import axios from "axios";
import { createReservedVirtualAccount, md5Hex, verifyBillstackSignature } from "../lib/billstack-core.mjs";
import { processBillstackWebhookWithAdapter } from "../lib/billstack-webhook-core.mjs";
import { purchaseData as purchaseAlrahuzData, purchaseAirtime as purchaseAlrahuzAirtime } from "../lib/alrahuz.mjs";
import { purchaseData as purchaseAmysubData } from "../lib/amysub.ts";
import { purchaseDataByPlan } from "../lib/data-provider.mjs";

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

async function testAlrahuzDataClient() {
  let seen = null;

  const postImpl = async (url, body, init) => {
    seen = { url, body, init };
    return {
      status: 200,
      data: {
        status: true,
        data: {
          message: "Data queued",
          reference: "ARH-123",
        },
      },
    };
  };

  const result = await purchaseAlrahuzData(
    {
      network: 1,
      plan: 423,
      phone: "09037346247",
      reference: "DATA-REF-1",
    },
    {
      baseUrl: "https://alrahuzdata.com.ng/api",
      token: "token_123",
      postImpl,
    }
  );

  assert.equal(seen.url, "https://alrahuzdata.com.ng/api/data/");
  assert.equal(seen.init.headers.Authorization, "Token token_123");
  assert.equal(seen.init.headers["Content-Type"], "application/json");
  assert.deepEqual(seen.body, {
    network: 1,
    mobile_number: "09037346247",
    plan: 423,
    Ported_number: true,
  });
  assert.equal(result.success, true);
  assert.equal(result.message, "Data queued");
  assert.equal(result.externalReference, "ARH-123");
}

async function testAlrahuzDataClientFailureResponse() {
  let seen = null;

  const postImpl = async (url, body, init) => {
    seen = { url, body, init };
    return {
      status: 400,
      data: {
        message: "invalid input value for enum \"ApiSource\": \"API_C\"",
        reference: "ARH-ERR-1",
      },
    };
  };

  const result = await purchaseAlrahuzData(
    {
      network: 1,
      plan: 423,
      phone: "09037346247",
      reference: "DATA-REF-FAIL-1",
    },
    {
      baseUrl: "https://alrahuzdata.com.ng/api",
      token: "token_123",
      postImpl,
    }
  );

  assert.equal(seen.url, "https://alrahuzdata.com.ng/api/data/");
  assert.equal(result.success, false);
  assert.equal(result.message, "invalid input value for enum \"ApiSource\": \"API_C\"");
  assert.equal(result.externalReference, "ARH-ERR-1");
}

async function testAlrahuzAirtimeClientFailure() {
  let seen = null;

  const postImpl = async (url, body, init) => {
    seen = { url, body, init };
    return {
      status: 200,
      data: {
        status: false,
        message: "Airtime failed",
        reference: "AIR-456",
      },
    };
  };

  const result = await purchaseAlrahuzAirtime(
    {
      network: 4,
      amount: 500,
      phone: "08012345678",
      reference: "AIR-REF-1",
    },
    {
      baseUrl: "https://alrahuzdata.com.ng/api",
      token: "token_123",
      postImpl,
    }
  );

  assert.equal(seen.url, "https://alrahuzdata.com.ng/api/topup/");
  assert.deepEqual(seen.body, {
    network: 4,
    amount: 500,
    mobile_number: "08012345678",
    Ported_number: true,
    airtime_type: "VTU",
  });
  assert.equal(result.success, false);
  assert.equal(result.message, "Airtime failed");
  assert.equal(result.externalReference, "AIR-456");
}

async function testAlrahuzAirtimeClientUsesNetworkIdFallback() {
  let seen = null;

  const postImpl = async (url, body, init) => {
    seen = { url, body, init };
    return {
      status: 200,
      data: {
        status: true,
        message: "Airtime queued",
        reference: "AIR-789",
      },
    };
  };

  const result = await purchaseAlrahuzAirtime(
    {
      networkId: 1,
      amount: 1000,
      phone: "08164135836",
      reference: "AIR-REF-2",
    },
    {
      baseUrl: "https://alrahuzdata.com.ng/api",
      token: "token_123",
      postImpl,
    }
  );

  assert.deepEqual(seen.body, {
    network: 1,
    amount: 1000,
    mobile_number: "08164135836",
    Ported_number: true,
    airtime_type: "VTU",
  });
  assert.equal(result.success, true);
  assert.equal(result.message, "Airtime queued");
}

async function testApiCRouting() {
  let called = false;

  const result = await purchaseDataByPlan(
    {
      apiSource: "API_C",
      externalNetworkId: 1,
      externalPlanId: 777,
      network: "MTN",
    },
    {
      phone: "09037346247",
      reference: "DATA-REF-API-C",
    },
    {
      API_A: async () => {
        throw new Error("API_A should not be called");
      },
      API_B: async () => {
        throw new Error("API_B should not be called");
      },
      API_C: async (params) => {
        called = true;
        assert.deepEqual(params, {
          network: 1,
          plan: 777,
          phone: "09037346247",
          reference: "DATA-REF-API-C",
        });
        return {
          success: true,
          message: "OK",
          externalReference: "ARH-777",


        };
      },
    }
  );

  assert.equal(called, true);
  assert.equal(result.success, true);
  assert.equal(result.externalReference, "ARH-777");
}

async function testApiDRouting() {
  let called = false;

  const result = await purchaseDataByPlan(
    {
      apiSource: "API_D",
      externalNetworkId: 1,
      externalPlanId: 888,
      network: "MTN",
    },
    {
      phone: "0810778800",
      reference: "DATA-REF-API-D",
    },
    {
      API_D: async (params) => {
        called = true;
        assert.deepEqual(params, {
          plan: 888,
          network: 1,
          phone: "0810778800",
          reference: "DATA-REF-API-D",
        });
        return {
          success: true,
          message: "OK",
          externalReference: "AMY-888",
        };
      },
    }
  );

  assert.equal(called, true);
  assert.equal(result.success, true);
  assert.equal(result.externalReference, "AMY-888");
}

async function testAmysubDataClientSuccess() {
  const originalPost = axios.post;
  let seen = null;
  axios.post = async (url, body, config) => {
    seen = { url, body, config };
    return {
      status: 200,
      data: {
        id: 847931,
        network: {},
        ident: "DT20260616231301406986",
        amount: "440.00",
        api_response: "Y'ello! You have gifted 1GB to 2348164135836.",
        description: "1GB Data MTN to 08164135836",
        Status: "successful",
      },
    };
  };

  process.env.AMYSUB_API_KEY = "test_key";
  try {
    const result = await purchaseAmysubData({
      plan: 123,
      network: 1,
      phone: "08164135836",
      reference: "test_ref",
    });

    assert.equal(seen.url, "https://app.amysub.ng/api/data");
    assert.equal(seen.config.headers.Authorization, "Bearer test_key");
    assert.equal(result.success, true);
    assert.equal(result.message, "Y'ello! You have gifted 1GB to 2348164135836.");
    assert.equal(result.externalReference, "DT20260616231301406986");
  } finally {
    axios.post = originalPost;
  }
}

async function testAmysubDataClientFailure() {
  const originalPost = axios.post;
  axios.post = async () => {
    return {
      status: 200,
      data: {
        Status: "failed",
        api_response: "Insufficient wallet balance",
      },
    };
  };

  process.env.AMYSUB_API_KEY = "test_key";
  try {
    const result = await purchaseAmysubData({
      plan: 123,
      network: 1,
      phone: "08164135836",
      reference: "test_ref",
    });

    assert.equal(result.success, false);
    assert.equal(result.message, "Insufficient wallet balance");
  } finally {
    axios.post = originalPost;
  }
}

async function main() {
  const tests = [
    ["BillStack create account client", testCreateReservedVirtualAccount],
    ["BillStack webhook signature + idempotency", testWebhookSignatureAndIdempotency],
    ["Alrahuz data client", testAlrahuzDataClient],
    ["Alrahuz data client failure response", testAlrahuzDataClientFailureResponse],
    ["Alrahuz airtime client failure", testAlrahuzAirtimeClientFailure],
    ["Alrahuz airtime client networkId fallback", testAlrahuzAirtimeClientUsesNetworkIdFallback],
    ["API_C routing", testApiCRouting],
    ["API_D routing", testApiDRouting],
    ["Amysub data client success response", testAmysubDataClientSuccess],
    ["Amysub data client failure response", testAmysubDataClientFailure],
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
