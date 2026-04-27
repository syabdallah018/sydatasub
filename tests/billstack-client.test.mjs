import test from "node:test";
import assert from "node:assert/strict";
import { createReservedVirtualAccount, md5Hex } from "../lib/billstack-core.mjs";

test("createReservedVirtualAccount sends auth header and parses response", async () => {
  let seenHeaders = null;
  let seenBody = null;

  const fetchImpl = async (_url, init) => {
    seenHeaders = init.headers;
    seenBody = JSON.parse(init.body);
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
  assert.equal(seenBody.reference, "BS-VA-user-1");
  assert.equal(result.accountNumber, "0000000000");
  assert.equal(result.providerReference, "R-123");
});

test("createReservedVirtualAccount retries transient network errors", async () => {
  let attempts = 0;
  const fetchImpl = async () => {
    attempts += 1;
    if (attempts < 2) {
      throw new TypeError("network down");
    }
    return new Response(
      JSON.stringify({
        status: true,
        message: "Account reserved",
        data: {
          reference: "R-777",
          account: [
            {
              account_number: "1111111111",
              account_name: "Alias-User",
              bank_name: "Palmpay Bank",
              bank_id: "PALMPAY",
              created_at: "2024-04-02 05:47:42",
            },
          ],
        },
      }),
      { status: 200 }
    );
  };

  const result = await createReservedVirtualAccount(
    {
      reference: "BS-VA-user-2",
      email: "user2@example.com",
      firstName: "User",
      lastName: "Two",
      phone: "09012345679",
      bank: "PALMPAY",
    },
    {
      config: {
        baseUrl: "https://api.billstack.co",
        secretKey: "secret_123",
        maxRetries: 2,
        timeoutMs: 2000,
      },
      fetchImpl,
    }
  );

  assert.equal(attempts, 2);
  assert.equal(result.providerReference, "R-777");
});

test("md5Hex matches expected digest format", () => {
  assert.equal(md5Hex("abc"), "900150983cd24fb0d6963f7d28e17f72");
});

