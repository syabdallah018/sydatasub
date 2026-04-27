export const BILLSTACK_BANKS: readonly ["9PSB", "SAFEHAVEN", "PROVIDUS", "BANKLY", "PALMPAY"];

export class BillstackApiError extends Error {
  statusCode?: number;
  payload?: unknown;
  attempt?: number;
}

export function getBillstackConfig(env?: NodeJS.ProcessEnv): {
  secretKey: string;
  baseUrl: string;
  timeoutMs: number;
  maxRetries: number;
  defaultBank: string;
};

export function md5Hex(value: string): string;
export function verifyBillstackSignature(signatureHeader: string | null, secretKey: string): boolean;

export function createReservedVirtualAccount(
  input: {
    reference: string;
    email: string;
    phone: string;
    firstName: string;
    lastName: string;
    bank: "9PSB" | "SAFEHAVEN" | "PROVIDUS" | "BANKLY" | "PALMPAY";
  },
  options?: {
    env?: NodeJS.ProcessEnv;
    config?: Partial<{
      secretKey: string;
      baseUrl: string;
      timeoutMs: number;
      maxRetries: number;
      defaultBank: string;
    }>;
    fetchImpl?: typeof fetch;
  }
): Promise<{
  providerReference: string;
  merchantReference: string;
  accountNumber: string;
  accountName: string;
  bankName: string;
  bankId: string;
  createdAt: string;
  raw: unknown;
}>;

