import { neon } from "@neondatabase/serverless";

type SqlParams = any[];
type SqlExecutor = ReturnType<typeof neon>;

let sqlClient: SqlExecutor | null = null;

function getSql(): SqlExecutor {
  if (sqlClient) {
    return sqlClient;
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not configured");
  }

  sqlClient = neon(databaseUrl);
  return sqlClient;
}

export async function query<T = any>(sqlQuery: string, params: SqlParams = []): Promise<T[]> {
  try {
    const result = await getSql()(sqlQuery, params);
    return result as T[];
  } catch (error) {
    console.error("Database query error:", error);
    throw error;
  }
}

export async function queryOne<T = any>(sqlQuery: string, params: SqlParams = []): Promise<T | null> {
  const results = await query<T>(sqlQuery, params);
  return results.length > 0 ? results[0] : null;
}

export async function execute(sqlQuery: string, params: SqlParams = []): Promise<number> {
  try {
    const result = await getSql()(sqlQuery, params);
    return Array.isArray(result) ? result.length : 0;
  } catch (error) {
    console.error("Database execute error:", error);
    throw error;
  }
}

export const sql = (sqlQuery: string, params: SqlParams = []) => getSql()(sqlQuery, params);
