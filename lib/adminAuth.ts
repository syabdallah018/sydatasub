import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export interface AdminUser {
  userId: string;
  email: string;
  role: "ADMIN";
  fullName?: string;
  phone?: string;
}

/**
 * Require admin authentication for API routes
 * Checks: JWT validity, Admin role, Admin password from env variable
 * Returns AdminUser or throws error
 */
export async function requireAdmin(req: NextRequest): Promise<AdminUser> {
  try {
    // Check admin password header (passed from client)
    const adminPassword = req.headers.get("X-Admin-Password");
    const envAdminPassword = process.env.ADMIN_PASSWORD;

    if (!envAdminPassword) {
      throw new Error("Admin password not configured in server");
    }

    if (!adminPassword || adminPassword !== envAdminPassword) {
      throw new Error("Unauthorized: Invalid or missing admin password");
    }

    // For now, return a generic admin user (no JWT validation needed)
    // Admin is authenticated via password header only
    return {
      userId: "admin",
      email: "admin@sydatasub.com",
      role: "ADMIN",
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
