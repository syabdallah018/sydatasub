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
 * Extracts user from JWT, verifies admin role
 * Returns AdminUser or throws error
 */
export async function requireAdmin(req: NextRequest): Promise<AdminUser> {
  try {
    const jwtPayload = await getSessionUser(req);

    if (!jwtPayload) {
      throw new Error("Unauthorized: No valid session");
    }

    if (jwtPayload.role !== "ADMIN") {
      throw new Error("Forbidden: Admin role required");
    }

    // Fetch full admin user details from database
    const adminUser = await prisma.user.findUnique({
      where: { id: jwtPayload.userId },
      select: {
        id: true,
        fullName: true,
        phone: true,
        email: true,
        role: true,
      },
    });

    if (!adminUser || adminUser.role !== "ADMIN") {
      throw new Error("Forbidden: User is no longer an admin");
    }

    return {
      userId: adminUser.id,
      email: adminUser.email || "",
      role: "ADMIN",
      fullName: adminUser.fullName,
      phone: adminUser.phone,
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
