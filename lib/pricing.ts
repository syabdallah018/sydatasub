import { Plan, User } from "@prisma/client";
import { prisma } from "@/lib/db";

type PlanLike = {
  id?: string;
  price: number;
  user_price: number;
  agent_price: number;
};

type UserLike =
  | (Partial<Pick<User, "id" | "tier">> & { customPrice?: number | null })
  | null
  | undefined;

/**
 * Resolves the effective price in NAIRA for a user.
 * Order of precedence:
 * 1. Explicit custom price override (passed directly or from user's custom price for this plan)
 * 2. User's custom price attached to user object
 * 3. Reseller/agent price if user tier is "agent"
 * 4. Standard customer user_price
 * 5. Fallback plan price
 */
export function getPlanPriceForUser(
  plan: PlanLike,
  user: UserLike,
  customPriceOverride?: number | null
): number {
  if (customPriceOverride !== undefined && customPriceOverride !== null && customPriceOverride > 0) {
    return customPriceOverride;
  }

  if (user?.customPrice && user.customPrice > 0) {
    return user.customPrice;
  }

  if (user?.tier === "agent" && plan.agent_price > 0) {
    return plan.agent_price;
  }

  if (plan.user_price > 0) {
    return plan.user_price;
  }

  return plan.price;
}

/**
 * Fetch a single custom price for a specific user and plan
 */
export async function getUserCustomPriceForPlan(
  userId: string | undefined | null,
  planId: string
): Promise<number | null> {
  if (!userId) return null;
  try {
    const custom = await prisma.userCustomPrice.findUnique({
      where: {
        userId_planId: { userId, planId },
      },
      select: { price: true },
    });
    return custom?.price ?? null;
  } catch (error) {
    console.error("[GET USER CUSTOM PRICE ERROR]", error);
    return null;
  }
}

/**
 * Fetch all custom prices for a specific user as a Map<planId, price>
 */
export async function getUserCustomPriceMap(
  userId: string | undefined | null
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (!userId) return map;
  try {
    const customs = await prisma.userCustomPrice.findMany({
      where: { userId },
      select: { planId: true, price: true },
    });
    for (const c of customs) {
      map.set(c.planId, c.price);
    }
  } catch (error) {
    console.error("[GET USER CUSTOM PRICE MAP ERROR]", error);
  }
  return map;
}
