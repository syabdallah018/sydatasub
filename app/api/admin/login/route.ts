import { NextRequest, NextResponse } from "next/server";
import { createAdminSessionResponse, validateAdminPassword, validateAdminPasswordAsync } from "@/lib/adminAuth";
import { prisma } from "@/lib/db";
import bcryptjs from "bcryptjs";
import { z } from "zod";
import { enforceRateLimit, rejectCrossSiteMutation } from "@/lib/security";

/**
 * POST /api/admin/login
 * Password-only admin authentication with database password precedence
 */
const adminLoginSchema = z.object({
  password: z.string().min(1, "Admin password required"),
});

export async function POST(req: NextRequest) {
  try {
    const originError = rejectCrossSiteMutation(req, { requireOrigin: true });
    if (originError) return originError;

    const rateLimitError = enforceRateLimit(req, "login", "admin-login");
    if (rateLimitError) return rateLimitError;

    const body = await req.json();
    const { password } = adminLoginSchema.parse(body);

    const verification = await validateAdminPasswordAsync(password);
    if (!verification.isValid) {
      return NextResponse.json(
        { error: "Invalid admin password" },
        { status: 401 }
      );
    }

    // Resolve admin user from DB
    let adminUser = verification.adminUser;
    if (!adminUser) {
      adminUser = await prisma.user.findFirst({
        where: { role: "ADMIN", isBanned: false },
        select: {
          id: true,
          fullName: true,
          phone: true,
          email: true,
          role: true,
          isBanned: true,
        },
        orderBy: { joinedAt: "asc" },
      });
    }

    if (!adminUser || adminUser.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Admin account not found" },
        { status: 404 }
      );
    }

    if (adminUser.isBanned) {
      return NextResponse.json(
        { error: "Admin account is banned" },
        { status: 403 }
      );
    }

    return createAdminSessionResponse({
      userId: adminUser.id,
      email: adminUser.email || adminUser.phone || "admin@sydatasub.com",
      role: "ADMIN",
      fullName: adminUser.fullName || "Admin",
      phone: adminUser.phone || "07068614426",
    });
  } catch (error) {
    console.error("Admin login error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Login failed" },
      { status: 500 }
    );
  }
}
