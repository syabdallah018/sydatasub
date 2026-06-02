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
export const PROVIDER_TECHNICAL_FAILURE_MESSAGE = "unable to send data, try again later";
export const DATA_PURCHASE_SUCCESS_MESSAGE = "Data purchase completed successfully";
export const AIRTIME_PURCHASE_SUCCESS_MESSAGE = "Airtime purchase completed successfully";
export const PURCHASE_FAILED_GENERIC_MESSAGE = "Purchase failed. Please try again later.";

export function normalizeProviderFailureMessage(message?: string | null) {
  const normalizedMessage = (message || "").toLowerCase();

  if (PLAN_UNAVAILABLE_PATTERNS.some((pattern) => normalizedMessage.includes(pattern))) {
    return PLAN_UNAVAILABLE_MESSAGE;
  }

  if (PROVIDER_TECHNICAL_FAILURE_PATTERNS.some((pattern) => normalizedMessage.includes(pattern))) {
    return PROVIDER_TECHNICAL_FAILURE_MESSAGE;
  }

  return message || "Purchase failed";
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
