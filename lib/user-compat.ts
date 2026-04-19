import { getDbCapabilities } from "@/lib/db-capabilities";
import { AgentRequestStatus } from "@prisma/client";

export async function getUserSelectCompat() {
  const caps = await getDbCapabilities();

  return {
    rewardBalance: caps.userRewardBalance,
    agentRequestStatus: caps.userAgentRequestStatus,
  };
}

export function withCompatibleUserFields<T extends Record<string, unknown>>(
  base: T,
  caps: { rewardBalance: boolean; agentRequestStatus: boolean }
) {
  return {
    ...base,
    ...(caps.rewardBalance ? { rewardBalance: true } : {}),
    ...(caps.agentRequestStatus ? { agentRequestStatus: true } : {}),
  };
}

export function normalizeUserCompat<T extends { balance?: number }>(
  user: T & { rewardBalance?: number; agentRequestStatus?: string | null }
) {
  return {
    ...user,
    rewardBalance: user.rewardBalance ?? 0,
    agentRequestStatus: user.agentRequestStatus ?? "NONE",
  };
}

export async function buildUserCreateCompatData<T extends Record<string, unknown>>(base: T) {
  const caps = await getUserSelectCompat();

  return {
    ...base,
    ...(caps.rewardBalance ? { rewardBalance: 0 } : {}),
    ...(caps.agentRequestStatus ? { agentRequestStatus: AgentRequestStatus.NONE } : {}),
  };
}
