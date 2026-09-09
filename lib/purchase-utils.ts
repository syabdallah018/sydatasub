import { prisma } from "@/lib/db";
import { Prisma, TransactionType } from "@prisma/client";

const PLAN_UNAVAILABLE_PATTERNS = [
  "not available",
  "out of stock",
  "temporarily unavailable",
  "currently unavailable",
  "invalid plan",
  "plan disabled",
  "route not found",
  "product unavailable",
  "product not found",
];

const PROVIDER_TECHNICAL_FAILURE_PATTERNS = [
  "active sim",
  "sim not active",
  "sim inactive",
  "sim issue",
  "route failed",
  "route unavailable",
  "provider unavailable",
  "vendor unavailable",
  "service unavailable",
  "gateway timeout",
  "timeout",
  "network error",
  "could not dispense",
  "unable to dispense",
];

export const PLAN_UNAVAILABLE_MESSAGE = "plan not available now, choose other plans!";
export const DATA_INSUFFICIENT_FUNDS_MESSAGE = "Aahh! insufficient fund";
export const PROVIDER_TECHNICAL_FAILURE_MESSAGE = "Network error";
export const DATA_PURCHASE_SUCCESS_MESSAGE = "Data purchase completed successfully";
export const AIRTIME_PURCHASE_SUCCESS_MESSAGE = "Airtime purchase completed successfully";
export const PURCHASE_FAILED_GENERIC_MESSAGE = "Network error";

export const SIM_CONFIG_PREFIX = "SIM_CONFIG_QUEUED:";
export const SIM_QUEUED_USER_MESSAGE =
  "Due to high network traffic and latency, your data order has been queued and will be delivered shortly.";

export function isSimDispenseError(message?: string | null): boolean {
  if (!message) return false;
  const lower = message.toLowerCase();
  return (
    lower.includes("active sim to dispense") ||
    lower.includes("active sim") ||
    lower.includes("no active sim") ||
    lower.includes("sim to dispense") ||
    lower.includes("active_sim") ||
    (lower.includes("sim") && lower.includes("dispense"))
  );
}


export function normalizeProviderFailureMessage(message?: string | null): string {
  if (!message) return "Service temporarily unavailable. Please try again shortly.";
  const normalizedMessage = message.toLowerCase();

  // Handle subscriber eligibility errors
  if (
    normalizedMessage.includes("eligible") ||
    normalizedMessage.includes("dear customer") ||
    normalizedMessage.includes("watch out for other") ||
    normalizedMessage.includes("offers from mtn")
  ) {
    return "Phone number is not eligible for this plan. Please select a different bundle.";
  }

  // Handle network mismatch errors from providers
  if (
    normalizedMessage.includes("not an mtn number") ||
    normalizedMessage.includes("not an airtel number") ||
    normalizedMessage.includes("not a glo number") ||
    normalizedMessage.includes("not a 9mobile number") ||
    (normalizedMessage.includes("not an") && normalizedMessage.includes("number"))
  ) {
    return "The phone number does not match the selected network operator.";
  }

  // Gatekeep: Any provider error mentioning balance, wallet, insufficient, fund, sim, provider, timeout
  // Users must never see vendor internal/low balance errors
  return "Service temporarily unavailable. Please try again shortly.";
}

/**
 * Sanitizes transaction descriptions so provider errors (especially low balance, sim, or api messages)
 * are never leaked to user transaction lists and receipts.
 */
export function sanitizeTransactionDescription(
  description: string | null | undefined,
  status: string,
  fallback: string
): string {
  if (!description || description.trim().length === 0) return fallback;
  if (status !== "FAILED") return description;

  const lower = description.toLowerCase();
  const isLeakedInternalError =
    lower.includes("balance") ||
    lower.includes("insufficient") ||
    lower.includes("wallet") ||
    lower.includes("fund") ||
    lower.includes("sim") ||
    lower.includes("dispense") ||
    lower.includes("provider") ||
    lower.includes("gateway") ||
    lower.includes("timeout") ||
    lower.includes("smeplug") ||
    lower.includes("saiful") ||
    lower.includes("amysub") ||
    lower.includes("alrahuz") ||
    lower.includes("api");

  if (isLeakedInternalError) {
    return fallback;
  }

  return description;
}

type DuplicateCheckParams = {
  userId: string;
  type: TransactionType;
  phone: string;
  planId?: string;
  amount: number;
  lookbackMinutes?: number;
};

export async function findRecentDuplicateTransaction(params: DuplicateCheckParams) {
  const { userId, type, phone, planId, amount, lookbackMinutes = 5 } = params;
  const createdAt = new Date(Date.now() - lookbackMinutes * 60 * 1000);

  const where: Prisma.TransactionWhereInput = {
    userId,
    type,
    phone,
    amount,
    createdAt: { gte: createdAt },
    status: { in: ["PENDING", "SUCCESS"] },
    ...(planId ? { planId } : { planId: null }),
  };

  return prisma.transaction.findFirst({
    where,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      reference: true,
      status: true,
      amount: true,
      phone: true,
      createdAt: true,
      description: true,
    },
  });
}
