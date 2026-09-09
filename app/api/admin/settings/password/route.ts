import { NextRequest, NextResponse } from "next/server";
import { enforceAdminMutationGuard, requireAdmin, validateAdminPasswordAsync } from "@/lib/adminAuth";
import { prisma } from "@/lib/db";
import bcryptjs from "bcryptjs";
import { z } from "zod";

export const dynamic = "force-dynamic";

const updatePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
});

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);

    const user = await prisma.user.findUnique({
      where: { id: admin.userId },
      select: {
        id: true,
        fullName: true,
        phone: true,
        email: true,
        adminPasswordHash: true,
      },
    });

    return NextResponse.json({
      success: true,
      hasDbPassword: !!user?.adminPasswordHash,
      admin: {
        fullName: user?.fullName || "Admin",
        phone: user?.phone,
        email: user?.email,
      },
    });
  } catch (error: any) {
    if (error.message?.includes("Unauthorized")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const originError = enforceAdminMutationGuard(req);
    if (originError) return originError;

    const admin = await requireAdmin(req);
    const body = await req.json();
    const { currentPassword, newPassword } = updatePasswordSchema.parse(body);

    // Verify current password (DB first, fallback to ENV)
    const verification = await validateAdminPasswordAsync(currentPassword);
    if (!verification.isValid) {
      return NextResponse.json(
        { success: false, error: "Current password is incorrect." },
        { status: 400 }
      );
    }

    // Hash the new password with bcrypt
    const hashedPassword = await bcryptjs.hash(newPassword, 12);

    // Update the admin user record in the Neon database
    await prisma.user.update({
      where: { id: admin.userId },
      data: {
        adminPasswordHash: hashedPassword,
      },
    });

    console.info(`[ADMIN SETTINGS] Password updated successfully in DB for admin ${admin.userId} (${admin.phone})`);

    return NextResponse.json({
      success: true,
      message: "Admin password updated successfully in the database. You can now use your new password to sign in.",
    });
  } catch (error: any) {
    console.error("[ADMIN SETTINGS PASSWORD ERROR]", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.issues[0].message }, { status: 400 });
    }
    if (error.message?.includes("Unauthorized")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: "Failed to update password." }, { status: 500 });
  }
}
