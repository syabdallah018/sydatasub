export function normalizeBillstackWebhookPayload(input: unknown): {
  event: string;
  type: string;
  transactionReference: string | null;
  merchantReference: string | null;
  interbankReference: string | null;
  amountNaira: number;
  accountNumber: string | null;
  raw: unknown;
};

export function processBillstackWebhookWithAdapter(
  payload: unknown,
  adapter: {
    findProcessedEvent: (input: {
      transactionReference?: string | null;
      interbankReference?: string | null;
    }) => Promise<{ id?: string; transactionId?: string | null } | null>;
    resolveAccount: (input: {
      merchantReference?: string | null;
      accountNumber?: string | null;
    }) => Promise<{ userId: string } | null>;
    withLock: (lockKey: string, fn: () => Promise<unknown>) => Promise<unknown>;
    recordReceived: (payload: unknown) => Promise<string>;
    creditWallet: (input: {
      userId: string;
      amountNaira: number;
      transactionReference?: string | null;
      interbankReference?: string | null;
      merchantReference?: string | null;
      payload: unknown;
    }) => Promise<{ transactionId: string; balanceAfter?: number }>;
    markProcessed: (eventId: string, transactionId: string) => Promise<void>;
  }
): Promise<{
  status: "processed" | "duplicate" | "ignored";
  reason: string;
  payload: unknown;
  transactionId?: string | null;
  balanceAfter?: number;
}>;
