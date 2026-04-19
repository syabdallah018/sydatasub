import { NextRequest, NextResponse } from "next/server";
import { enforceAdminMutationGuard, requireAdmin } from "@/lib/adminAuth";
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
        isBanned: true,
        joinedAt: true,
        ...withCompatibleUserFields({}, compat),
        virtualAccount: {
          select: {
            accountNumber: true,
            bankName: true,
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

    return NextResponse.json(normalizeUserCompat(userData), { status: 200 });
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
        ...(dbCaps.userRewardBalance ? { rewardBalance: true } : {}),
        ...(dbCaps.userAgentRequestStatus ? { agentRequestStatus: true } : {}),
      },
    });

    return NextResponse.json(normalizeUserCompat(updated), { status: 200 });
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
