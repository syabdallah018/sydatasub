import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/**
 * Optimizes the PostgreSQL database URL for Neon Serverless & PgBouncer.
 * Neon charges for active compute hours; using pooled connections with
 * a strict connection limit (1 in serverless) and PgBouncer prevents connection bloat
 * and allows the Neon compute endpoint to suspend automatically when idle.
 */
function resolveDatabaseUrl(): string | undefined {
  const raw =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL;
  if (!raw) return undefined;

  try {
    const parsed = new URL(raw);

    // Prisma's Linux query engine on Vercel fails SCRAM channel_binding=require over PgBouncer
    parsed.searchParams.delete("channel_binding");

    const isNeonHost = parsed.hostname.includes("neon.tech");

    // Automatically route to Neon's PgBouncer pooler endpoint if not already pooled
    if (isNeonHost && !parsed.hostname.includes("-pooler.") && process.env.NEON_DISABLE_AUTO_POOLER !== "true") {
      const parts = parsed.hostname.split(".");
      if (parts[0] && !parts[0].endsWith("-pooler")) {
        parts[0] = `${parts[0]}-pooler`;
        parsed.hostname = parts.join(".");
      }
    }

    if (parsed.hostname.includes("-pooler.") && !parsed.searchParams.has("pgbouncer")) {
      parsed.searchParams.set("pgbouncer", "true");
    }

    if (!parsed.searchParams.has("connect_timeout")) {
      parsed.searchParams.set("connect_timeout", "15");
    }

    if (!parsed.searchParams.has("pool_timeout")) {
      parsed.searchParams.set("pool_timeout", "15");
    }

    // In serverless environments (e.g. Vercel, AWS Lambda), limit connection pool per lambda instance to 1
    // to prevent connection exhaustion and keep Neon active compute minimal
    const isServerless =
      Boolean(process.env.VERCEL) ||
      Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME) ||
      process.env.NODE_ENV === "production";

    if (isServerless && !parsed.searchParams.has("connection_limit")) {
      parsed.searchParams.set("connection_limit", "1");
    }

    return parsed.toString();
  } catch {
    return raw;
  }
}

const datasourceUrl = resolveDatabaseUrl();

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    ...(datasourceUrl ? { datasources: { db: { url: datasourceUrl } } } : {}),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
