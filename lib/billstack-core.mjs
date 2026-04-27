import crypto from "crypto";
import { z } from "zod";

export const BILLSTACK_BANKS = ["9PSB", "SAFEHAVEN", "PROVIDUS", "BANKLY", "PALMPAY"];

const createAccountInputSchema = z.object({
  reference: z.string().min(3),
  email: z.string().email(),
  phone: z.string().regex(/^0[0-9]{10}$/),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  bank: z.enum(BILLSTACK_BANKS),
});

const createAccountResponseSchema = z.object({
  status: z.boolean(),
  message: z.string(),
  data: z
    .object({
      reference: z.string(),
      account: z
        .array(
          z.object({
            account_number: z.string(),
            account_name: z.string(),
            bank_name: z.string(),
            bank_id: z.string(),
            created_at: z.string(),
          })
        )
        .min(1),
      meta: z
        .object({
          firstName: z.string().optional(),
          lastName: z.string().optional(),
          email: z.string().optional(),
        })
        .optional(),
    })
    .optional(),
});

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function safeParseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export class BillstackApiError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "BillstackApiError";
    this.statusCode = details.statusCode;
    this.payload = details.payload;
    this.attempt = details.attempt;
  }
}

export function getBillstackConfig(env = process.env) {
  return {
    secretKey: env.BILLSTACK_SECRET_KEY || "",
    baseUrl: (env.BILLSTACK_BASE_URL || "https://api.billstack.co").replace(/\/$/, ""),
    timeoutMs: Number(env.BILLSTACK_TIMEOUT_MS || 12000),
    maxRetries: Number(env.BILLSTACK_MAX_RETRIES || 2),
    defaultBank: env.BILLSTACK_BANK || "PALMPAY",
  };
}

export function md5Hex(value) {
  return crypto.createHash("md5").update(value).digest("hex");
}

export function verifyBillstackSignature(signatureHeader, secretKey) {
  if (!signatureHeader || !secretKey) return false;
  const expected = md5Hex(secretKey);
  if (expected.length !== signatureHeader.length) return false;

  let mismatch = 0;
  for (let i = 0; i < expected.length; i += 1) {
    mismatch |= expected.charCodeAt(i) ^ signatureHeader.charCodeAt(i);
  }
  return mismatch === 0;
}

export function normalizeBillstackCreateAccountResponse(payload, merchantReference) {
  const parsed = createAccountResponseSchema.parse(payload);
  if (!parsed.status) {
    throw new BillstackApiError(parsed.message || "Billstack account reservation failed", {
      statusCode: 400,
      payload: parsed,
    });
  }

  if (!parsed.data?.account?.length) {
    throw new BillstackApiError("Billstack response missing account details", {
      statusCode: 502,
      payload: parsed,
    });
  }

  const account = parsed.data.account[0];
  return {
    providerReference: parsed.data.reference,
    merchantReference,
    accountNumber: account.account_number,
    accountName: account.account_name,
    bankName: account.bank_name,
    bankId: account.bank_id,
    createdAt: account.created_at,
    raw: parsed,
  };
}

export async function createReservedVirtualAccount(input, options = {}) {
  const config = {
    ...getBillstackConfig(options.env),
    ...options.config,
  };

  if (!config.secretKey) {
    throw new BillstackApiError("BILLSTACK_SECRET_KEY is not configured");
  }

  const validatedInput = createAccountInputSchema.parse({
    ...input,
    bank: input.bank || config.defaultBank,
  });

  const fetchImpl = options.fetchImpl || fetch;
  const endpoint = `${config.baseUrl}/v2/thirdparty/generateVirtualAccount/`;

  let lastError = null;
  for (let attempt = 0; attempt <= config.maxRetries; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

    try {
      const response = await fetchImpl(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.secretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(validatedInput),
        signal: controller.signal,
      });

      const text = await response.text();
      const payload = safeParseJson(text);
      if (!response.ok) {
        const message = payload?.message || `Billstack request failed with status ${response.status}`;
        throw new BillstackApiError(message, {
          statusCode: response.status,
          payload,
          attempt,
        });
      }

      return normalizeBillstackCreateAccountResponse(payload, validatedInput.reference);
    } catch (error) {
      lastError = error;
      const isRetryable =
        error?.name === "AbortError" ||
        error instanceof TypeError ||
        (error instanceof BillstackApiError &&
          (Number(error.statusCode) >= 500 || Number.isNaN(Number(error.statusCode))));

      if (!isRetryable || attempt >= config.maxRetries) {
        if (error instanceof BillstackApiError) throw error;
        throw new BillstackApiError("Billstack request failed", { payload: { message: String(error?.message || error) }, attempt });
      }

      await sleep(300 * (attempt + 1));
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError || new BillstackApiError("Billstack request failed");
}

