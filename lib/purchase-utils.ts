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

export function normalizeProviderFailureMessage(message?: string | null) {
  const normalizedMessage = (message || "").toLowerCase();

  // Handle subscriber eligibility errors
  if (
    normalizedMessage.includes("eligible") ||
    normalizedMessage.includes("dear customer") ||
    normalizedMessage.includes("watch out for other") ||
    normalizedMessage.includes("offers from mtn")
  ) {
    return "Phone number is not eligible for this plan.";
  }

  // Handle third-party vendor balance/technical connection/SIM issues -> return clean network error
  if (
    normalizedMessage.includes("active sim") ||
    normalizedMessage.includes("sim to dispense") ||
    normalizedMessage.includes("active_sim") ||
    normalizedMessage.includes("smeplug") ||
    normalizedMessage.includes("balance") ||
    normalizedMessage.includes("insufficient") ||
    normalizedMessage.includes("fund") ||
    normalizedMessage.includes("wallet") ||
    normalizedMessage.includes("network") ||
    normalizedMessage.includes("gateway") ||
    normalizedMessage.includes("timeout") ||
    normalizedMessage.includes("not available") ||
    PROVIDER_TECHNICAL_FAILURE_PATTERNS.some((pattern) => normalizedMessage.includes(pattern)) ||
    PLAN_UNAVAILABLE_PATTERNS.some((pattern) => normalizedMessage.includes(pattern))
  ) {
    return "Network error";
  }

  return PURCHASE_FAILED_GENERIC_MESSAGE;
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
