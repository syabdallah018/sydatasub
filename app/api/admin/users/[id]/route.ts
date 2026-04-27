import { NextRequest, NextResponse } from "next/server";
import { enforceAdminMutationGuard, logAdminAction, requireAdmin } from "@/lib/adminAuth";
import { prisma } from "@/lib/db";
import { getDbCapabilities } from "@/lib/db-capabilities";
import { getUserSelectCompat, normalizeUserCompat, withCompatibleUserFields } from "@/lib/user-compat";
import { z } from "zod";

const updateUserSchema = z.object({
  role: z.enum(["USER", "AGENT", "ADMIN"]).optional(),
  tier: z.enum(["user", "agent"]).optional(),
  agentRequestStatus: z.enum(["NONE", "PENDING", "APPROVED", "REJECTED"]).optional(),
  isBanned: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin(req);
    const compat = await getUserSelectCompat();
    
    const { id } = await params;

    const userData = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        tier: true,
        balance: true,
        isActive: true,
        isBanned: true,
        joinedAt: true,
        updatedAt: true,
        ...withCompatibleUserFields({}, compat),
        bankAccounts: {
          orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
          select: {
            id: true,
            bankCode: true,
            bankName: true,
            accountName: true,
            accountNumber: true,
            merchantReference: true,
            providerReference: true,
            isPrimary: true,
            createdAt: true,
          },
        },
        transactions: {
          take: 10,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            reference: true,
            type: true,
            status: true,
            amount: true,
            phone: true,
            createdAt: true,
          },
        },
        _count: {
          select: { transactions: true },
        },
      },
    });

    if (!userData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const normalizedUser = normalizeUserCompat(userData);
    return NextResponse.json(normalizedUser, { status: 200 });
  } catch (error: any) {
    console.error("[GET USER ERROR]", error);

    if (error.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error.message.includes("Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const originError = enforceAdminMutationGuard(req);
    if (originError) return originError;

    await requireAdmin(req);
    const dbCaps = await getDbCapabilities();
    
    const { id } = await params;
    const body = await req.json();
    const data = updateUserSchema.parse(body);

    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const updateData: any = { ...data };

    if (dbCaps.userAgentRequestStatus && data.agentRequestStatus === "APPROVED") {
      updateData.agentRequestStatus = "APPROVED";
      updateData.tier = "agent";
      updateData.role = data.role || "AGENT";
    } else if (dbCaps.userAgentRequestStatus && data.agentRequestStatus === "REJECTED") {
      updateData.agentRequestStatus = "REJECTED";
      updateData.tier = "user";
      if (user.role === "AGENT" && !data.role) {
        updateData.role = "USER";
      }
    }

    if (dbCaps.userAgentRequestStatus && data.tier === "agent" && data.agentRequestStatus !== "REJECTED") {
      updateData.agentRequestStatus = "APPROVED";
    }

    if (!dbCaps.userAgentRequestStatus) {
      delete updateData.agentRequestStatus;
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        fullName: true,
        phone: true,
        role: true,
        tier: true,
        balance: true,
        isBanned: true,
        ...(dbCaps.userAgentRequestStatus ? { agentRequestStatus: true } : {}),
      },
    });

    const normalizedUser = normalizeUserCompat(updated);

    logAdminAction(req, "user_profile_update", {
      targetUserId: id,
      changes: data,
      resultingRole: normalizedUser.role,
      resultingTier: normalizedUser.tier,
      resultingAgentRequestStatus:
        "agentRequestStatus" in normalizedUser ? normalizedUser.agentRequestStatus : "NONE",
    });

    return NextResponse.json(normalizedUser, { status: 200 });
  } catch (error: any) {
    console.error("[UPDATE USER ERROR]", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }

    if (error.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error.message.includes("Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const originError = enforceAdminMutationGuard(req);
    if (originError) return originError;

    await requireAdmin(req);
    const { id } = await params;

    const target = await prisma.user.findUnique({
      where: { id },
      select: { id: true, phone: true, role: true },
    });

    if (!target) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (target.role === "ADMIN") {
      return NextResponse.json({ error: "Admin user cannot be deleted" }, { status: 403 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: {
          isActive: false,
          isBanned: true,
        },
      });
    });

    logAdminAction(req, "user_soft_delete", {
      targetUserId: id,
      targetPhone: target.phone,
    });

    return NextResponse.json(
      { success: true, message: "User deactivated successfully" },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("[DELETE USER ERROR]", error);

    if (error.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error.message.includes("Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
