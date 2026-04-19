import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE_NAME, clearAdminSessionCookie, setAdminSessionCookie, signToken, verifyAdminToken } from "@/lib/auth";
import { rejectCrossSiteMutation, secureCompare } from "@/lib/security";

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

export async function createAdminSessionResponse() {
  const token = await signToken({
    userId: "admin",
    email: "admin@sydatasub.com",
    role: "ADMIN",
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

export function enforceAdminMutationGuard(req: NextRequest) {
  return rejectCrossSiteMutation(req);
}
