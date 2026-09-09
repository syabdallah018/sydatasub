import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE_NAME, clearAdminSessionCookie, setAdminSessionCookie, signToken, verifyAdminToken } from "@/lib/auth";
import { enforceRateLimit, getServerBaseUrl, rejectCrossSiteMutation, secureCompare } from "@/lib/security";
import { prisma } from "@/lib/db";
import bcryptjs from "bcryptjs";

export interface AdminUser {
  userId: string;
  email: string;
  role: "ADMIN";
  fullName?: string;
  phone?: string;
}

/**
 * Require admin authentication for API routes
 */
export async function requireAdmin(req: NextRequest): Promise<AdminUser> {
  try {
    const token = req.cookies.get(ADMIN_SESSION_COOKIE_NAME)?.value;
    if (!token) {
      throw new Error("Unauthorized");
    }

    const payload = await verifyAdminToken(token);
    if (!payload) {
      throw new Error("Unauthorized");
    }

    return {
      userId: payload.userId,
      email: payload.email,
      role: "ADMIN",
      fullName: payload.fullName,
      phone: payload.phone,
    };
  } catch (error: any) {
    console.error("[REQUIRE ADMIN ERROR]", error.message);
    throw error;
  }
}

/**
 * Send admin-only error response
 */
export function adminErrorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function createAdminSessionResponse(admin: AdminUser) {
  const token = await signToken({
    userId: admin.userId,
    email: admin.email,
    role: "ADMIN",
    fullName: admin.fullName,
    phone: admin.phone,
  });

  const response = NextResponse.json({ success: true, message: "Admin authenticated" }, { status: 200 });
  setAdminSessionCookie(response, token);
  return response;
}

export function clearAdminSessionResponse() {
  const response = NextResponse.json({ success: true, message: "Logged out" }, { status: 200 });
  clearAdminSessionCookie(response);
  return response;
}

export function validateAdminPassword(password: string | undefined | null): boolean {
  const configuredPassword = process.env.ADMIN_PASSWORD;
  if (!configuredPassword) {
    return false;
  }

  return secureCompare(password || "", configuredPassword);
}

/**
 * Asynchronously validate admin password against database first, then fallback to ENV
 */
export async function validateAdminPasswordAsync(password: string | undefined | null): Promise<{
  isValid: boolean;
  adminUser?: any;
  source: "DATABASE" | "ENV" | "NONE";
}> {
  if (!password) {
    return { isValid: false, source: "NONE" };
  }

  // 1. Look for admin user in DB
  const adminUsers = await prisma.user.findMany({
    where: { role: "ADMIN", isBanned: false },
    select: {
      id: true,
      fullName: true,
      phone: true,
      email: true,
      role: true,
      adminPasswordHash: true,
    },
    orderBy: { joinedAt: "asc" },
  });

  const primaryAdmin = adminUsers[0];

  // 2. If admin has a password in DB, check that first!
  if (primaryAdmin?.adminPasswordHash) {
    const isDbValid = await bcryptjs.compare(password, primaryAdmin.adminPasswordHash);
    if (isDbValid) {
      return { isValid: true, adminUser: primaryAdmin, source: "DATABASE" };
    }
    return { isValid: false, adminUser: primaryAdmin, source: "DATABASE" };
  }

  // 3. Fallback to ENV var password
  const configuredPassword = process.env.ADMIN_PASSWORD;
  if (configuredPassword && secureCompare(password, configuredPassword)) {
    return { isValid: true, adminUser: primaryAdmin, source: "ENV" };
  }

  return { isValid: false, source: "NONE" };
}

export function enforceAdminMutationGuard(req: NextRequest) {
  const originError = rejectCrossSiteMutation(req, { requireOrigin: true });
  if (originError) {
    console.warn(
      "[ADMIN AUDIT]",
      JSON.stringify({
        event: "admin_mutation_blocked_origin",
        path: req.nextUrl.pathname,
        method: req.method,
        origin: req.headers.get("origin"),
        referer: req.headers.get("referer"),
        userAgent: req.headers.get("user-agent"),
        at: new Date().toISOString(),
      })
    );
    return originError;
  }

  const rateError = enforceRateLimit(req, "adminMutation", "admin-mutation");
  if (rateError) {
    console.warn(
      "[ADMIN AUDIT]",
      JSON.stringify({
        event: "admin_mutation_rate_limited",
        path: req.nextUrl.pathname,
        method: req.method,
        userAgent: req.headers.get("user-agent"),
        at: new Date().toISOString(),
      })
    );
    return rateError;
  }
  return null;
}

export function logAdminAction(
  req: NextRequest,
  action: string,
  details?: Record<string, unknown>
) {
  console.info(
    "[ADMIN AUDIT]",
    JSON.stringify({
      event: "admin_action",
      action,
      path: req.nextUrl.pathname,
      method: req.method,
      origin: req.headers.get("origin") || req.headers.get("referer") || getServerBaseUrl(req),
      userAgent: req.headers.get("user-agent"),
      at: new Date().toISOString(),
      ...details,
    })
  );
}
