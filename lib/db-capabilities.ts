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
  const columns = await prisma.$queryRaw<Array<{ column_name: string }>>`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
  `;

  const tables = await prisma.$queryRaw<Array<{ table_name: string }>>`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN ('service_notices')
  `;

  const userColumnSet = new Set(columns.map((column) => column.column_name));
  const tableSet = new Set(tables.map((table) => table.table_name));

  return {
    userRewardBalance: userColumnSet.has("rewardBalance"),
    userAgentRequestStatus: userColumnSet.has("agentRequestStatus"),
    serviceNotices: tableSet.has("service_notices"),
  };
}

export async function getDbCapabilities() {
  if (!globalForDbCaps.dbCapabilitiesPromise) {
    globalForDbCaps.dbCapabilitiesPromise = loadCapabilities().catch((error) => {
      globalForDbCaps.dbCapabilitiesPromise = undefined;
      throw error;
    });
  }

  return globalForDbCaps.dbCapabilitiesPromise;
}

export function resetDbCapabilitiesCache() {
  globalForDbCaps.dbCapabilitiesPromise = undefined;
}

