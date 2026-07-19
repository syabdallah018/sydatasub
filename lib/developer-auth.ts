import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import bcryptjs from "bcryptjs";
import crypto from "crypto";

export interface DeveloperAuthResult {
  success: boolean;
  error?: string;
  status?: number;
  user?: any;
  developerProfile?: any;
}

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  // Standard fallback
  return "127.0.0.1";
}

export async function verifyDeveloperRequest(req: NextRequest): Promise<DeveloperAuthResult> {
  const apiKey = req.headers.get("x-api-key") || req.headers.get("X-API-Key");
  const apiSecret = req.headers.get("x-api-secret") || req.headers.get("X-API-Secret");

  if (!apiKey || !apiSecret) {
    return {
      success: false,
      error: "Authentication credentials required (x-api-key and x-api-secret headers)",
      status: 401,
    };
  }

  const profile = await prisma.developerProfile.findUnique({
    where: { apiKey },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          phone: true,
          email: true,
          role: true,
          tier: true,
          balance: true,
          isBanned: true,
          isActive: true,
          kycLocked: true,
        },
      },
    },
  });

  if (!profile || profile.status !== "APPROVED") {
    return {
      success: false,
      error: "Developer account not found or pending approval",
      status: 401,
    };
  }

  const { user } = profile;

  if (!user || user.isBanned || !user.isActive || user.kycLocked) {
    return {
      success: false,
      error: user?.kycLocked ? "Account KYC locked. Please contact support." : "Developer account is suspended or inactive",
      status: 403,
    };
  }

  // Validate Secret key
  const isSecretValid = await bcryptjs.compare(apiSecret, profile.apiSecretHash);
  if (!isSecretValid) {
    return {
      success: false,
      error: "Invalid API credentials",
      status: 401,
    };
  }

  // IP Whitelisting check
  if (profile.whitelistIps && profile.whitelistIps.length > 0) {
    const clientIp = getClientIp(req);
    // Allow local development check bypass if local
    const isIpMatched = profile.whitelistIps.some(ip => {
      if (ip === "*") return true;
      return ip === clientIp || clientIp.includes(ip);
    });

    if (!isIpMatched) {
      console.warn(`[DEV AUTH IP BLOCKED] Client IP: ${clientIp}, Allowed: ${profile.whitelistIps.join(", ")}`);
      return {
        success: false,
        error: `IP address not whitelisted: ${clientIp}`,
        status: 403,
      };
    }
  }

  return {
    success: true,
    user,
    developerProfile: profile,
  };
}

export function generateApiKey(): string {
  const bytes = crypto.randomBytes(12);
  return `sy_live_${bytes.toString("hex")}`;
}

export function generateClientSecret(): string {
  const bytes = crypto.randomBytes(16);
  return `sys_${bytes.toString("hex")}`;
}
