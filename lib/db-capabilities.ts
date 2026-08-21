import { prisma } from "@/lib/db";

type DbCapabilities = {
  userRewardBalance: boolean;
  userAgentRequestStatus: boolean;
  serviceNotices: boolean;
};

const globalForDbCaps = globalThis as unknown as {
  dbCapabilitiesPromise?: Promise<DbCapabilities>;
};

async function loadCapabilities(): Promise<DbCapabilities> {
  try {
    const columns = await prisma.$queryRaw<Array<{ column_name: string }>>`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'users' OR table_name = 'User'
    `;

    const tables = await prisma.$queryRaw<Array<{ table_name: string }>>`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_name IN ('service_notices', 'ServiceNotice')
    `;

    const userColumnSet = new Set(columns.map((column) => column.column_name));
    const tableSet = new Set(tables.map((table) => table.table_name));

    return {
      userRewardBalance: userColumnSet.has("rewardBalance") || true,
      userAgentRequestStatus: userColumnSet.has("agentRequestStatus") || true,
      serviceNotices: tableSet.has("service_notices") || tableSet.has("ServiceNotice") || true,
    };
  } catch (error) {
    console.warn("[DB CAPABILITIES WARN] Falling back to default capabilities:", error);
    return {
      userRewardBalance: true,
      userAgentRequestStatus: true,
      serviceNotices: true,
    };
  }
}

export async function getDbCapabilities() {
  if (!globalForDbCaps.dbCapabilitiesPromise) {
    globalForDbCaps.dbCapabilitiesPromise = loadCapabilities().catch(() => {
      return {
        userRewardBalance: true,
        userAgentRequestStatus: true,
        serviceNotices: true,
      };
    });
  }

  return globalForDbCaps.dbCapabilitiesPromise;
}

export function resetDbCapabilitiesCache() {
  globalForDbCaps.dbCapabilitiesPromise = undefined;
}
