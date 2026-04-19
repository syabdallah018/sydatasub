import { Plan, User } from "@prisma/client";

type PlanLike = Pick<Plan, "price" | "user_price" | "agent_price">;
type UserLike = Pick<User, "tier"> | null | undefined;

export function getPlanPriceForUser(plan: PlanLike, user: UserLike): number {
  if (user?.tier === "agent" && plan.agent_price > 0) {
    return plan.agent_price;
  }

  if (plan.user_price > 0) {
    return plan.user_price;
  }

  return plan.price;
}
