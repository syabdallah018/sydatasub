export interface FlutterwaveVirtualAccountRequest {
  email: string;
  tx_ref: string;
  phonenumber: string;
  firstname: string;
  lastname: string;
  narration?: string;
  is_permanent: true;
  bvn?: string;
  nin?: string;
}

export interface FlutterwaveVirtualAccountData {
  response_code: string;
  response_message: string;
  flw_ref: string;
  order_ref: string;
  account_number: string;
  frequency: string;
  bank_name: string;
  created_at: string;
  expiry_date: string;
  note: string;
  amount: string;
}

export interface FlutterwaveVirtualAccountResponse {
  status: "success" | "error";
  message: string;
  data: FlutterwaveVirtualAccountData | null;
}

export interface FlutterwaveVerifyTransactionResponse {
  status: "success" | "error";
  message: string;
  data: {
    id: number;
    tx_ref: string;
    flw_ref: string;
    amount: number;
    charged_amount: number;
    currency: string;
    status: string;
    payment_type: string;
    customer?: {
      email?: string;
      name?: string;
      phone_number?: string;
    };
  } | null;
}

const FLUTTERWAVE_BASE_URL =
  process.env.FLUTTERWAVE_BASE_URL || "https://api.flutterwave.com/v3";

const maskValue = (value?: string | null, visibleTail = 4) => {
  if (!value) return null;
  if (value.length <= visibleTail) return "*".repeat(value.length);
  return `${"*".repeat(Math.max(0, value.length - visibleTail))}${value.slice(-visibleTail)}`;
};

const sanitizeFlutterwavePayload = (payload: FlutterwaveVirtualAccountRequest) => ({
  ...payload,
  email: payload.email,
  phonenumber: payload.phonenumber,
  bvn: payload.bvn ? maskValue(payload.bvn) : undefined,
  nin: payload.nin ? maskValue(payload.nin) : undefined,
});

const getSecretKey = () => {
  const secretKey = process.env.FLUTTERWAVE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("FLUTTERWAVE_SECRET_KEY is not configured");
  }
  return secretKey;
};

export async function createFlutterwaveVirtualAccount(
  payload: FlutterwaveVirtualAccountRequest
): Promise<FlutterwaveVirtualAccountResponse> {
  const secretKey = getSecretKey();
  const url = `${FLUTTERWAVE_BASE_URL.replace(/\/+$/, "")}/virtual-account-numbers`;

  console.log("[FLUTTERWAVE][CREATE_ACCOUNT][REQUEST]", {
    url,
    payload: sanitizeFlutterwavePayload(payload),
    hasSecretKey: Boolean(secretKey),
  });

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const rawText = await response.text();
  let data: FlutterwaveVirtualAccountResponse | null = null;

  try {
    data = JSON.parse(rawText) as FlutterwaveVirtualAccountResponse;
  } catch (error) {
    console.error("[FLUTTERWAVE][CREATE_ACCOUNT][PARSE_ERROR]", {
      status: response.status,
      statusText: response.statusText,
      rawText,
      error,
    });
    throw new Error(`Flutterwave returned non-JSON response: ${response.status}`);
  }

  console.log("[FLUTTERWAVE][CREATE_ACCOUNT][RESPONSE]", {
    status: response.status,
    statusText: response.statusText,
    body: data,
  });

  if (!response.ok || data.status !== "success" || !data.data) {
    console.error("[FLUTTERWAVE][CREATE_ACCOUNT][FAILED]", {
      status: response.status,
      statusText: response.statusText,
      body: data,
    });
    throw new Error(data.message || `Flutterwave API error: ${response.status}`);
  }

  return data;
}

export async function verifyFlutterwaveTransaction(
  transactionId: number | string
): Promise<FlutterwaveVerifyTransactionResponse> {
  const secretKey = getSecretKey();

  const response = await fetch(
    `${FLUTTERWAVE_BASE_URL.replace(/\/+$/, "")}/transactions/${transactionId}/verify`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
    }
  );

  const data = (await response.json()) as FlutterwaveVerifyTransactionResponse;

  if (!response.ok || data.status !== "success" || !data.data) {
    throw new Error(data.message || `Flutterwave verify error: ${response.status}`);
  }

  return data;
}

export function generateFlutterwaveTxRef(userId: string): string {
  return `FLWVA-${Date.now()}-${userId.slice(-6)}`;
}

export function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return { firstName: "User", lastName: "User" };
  }
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: parts[0] };
  }
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}
