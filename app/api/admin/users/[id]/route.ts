import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { prisma } from "@/lib/db";
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
        rewardBalance: true,
        agentRequestStatus: true,
        isBanned: true,
        joinedAt: true,
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

    return NextResponse.json(userData, { status: 200 });
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
    await requireAdmin(req);

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

    if (data.agentRequestStatus === "APPROVED") {
      updateData.agentRequestStatus = "APPROVED";
      updateData.tier = "agent";
      updateData.role = data.role || "AGENT";
    } else if (data.agentRequestStatus === "REJECTED") {
      updateData.agentRequestStatus = "REJECTED";
      updateData.tier = "user";
      if (user.role === "AGENT" && !data.role) {
        updateData.role = "USER";
      }
    }

    if (data.tier === "agent" && data.agentRequestStatus !== "REJECTED") {
      updateData.agentRequestStatus = "APPROVED";
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
        rewardBalance: true,
        agentRequestStatus: true,
        isBanned: true,
      },
    });

    return NextResponse.json(updated, { status: 200 });
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
