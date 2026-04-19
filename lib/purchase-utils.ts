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

export const PLAN_UNAVAILABLE_MESSAGE = "plan not available now, choose other plans!";
export const DATA_INSUFFICIENT_FUNDS_MESSAGE = "Aahh! insufficient fund";

export function normalizeProviderFailureMessage(message?: string | null) {
  const normalizedMessage = (message || "").toLowerCase();

  if (PLAN_UNAVAILABLE_PATTERNS.some((pattern) => normalizedMessage.includes(pattern))) {
    return PLAN_UNAVAILABLE_MESSAGE;
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
