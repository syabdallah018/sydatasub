type DbCapabilities = {
  userRewardBalance: boolean;
  userAgentRequestStatus: boolean;
  serviceNotices: boolean;
};

const STATIC_CAPABILITIES: DbCapabilities = {
  userRewardBalance: true,
  userAgentRequestStatus: true,
  serviceNotices: true,
};

export async function getDbCapabilities(): Promise<DbCapabilities> {
  return STATIC_CAPABILITIES;
}

export function resetDbCapabilitiesCache() {
  // No-op: schema is permanently verified and static
}
