import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { enforceAdminMutationGuard, logAdminAction, requireAdmin } from "@/lib/adminAuth";
import { prisma } from "@/lib/db";
import { getDbCapabilities } from "@/lib/db-capabilities";

const updateSchema = z.object({
  action: z.enum(["APPROVE", "REJECT", "REVOKE", "PENDING"]),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guardError = enforceAdminMutationGuard(req);
    if (guardError) return guardError;
    await requireAdmin(req);

    const caps = await getDbCapabilities();
    if (!caps.userAgentRequestStatus) {
      return NextResponse.json(
        { success: false, error: "Agent application status is unavailable until migration is complete." },
        { status: 503 }
      );
    }

    const { id } = await params;
    const body = await req.json();
    const { action } = updateSchema.parse(body);

    const existing = await prisma.user.findUnique({
      where: { id },
      select: { id: true, tier: true, role: true, agentRequestStatus: true },
    });
    if (!existing) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    let data: any = {};
    if (action === "APPROVE") {
      data = { agentRequestStatus: "APPROVED", tier: "agent", role: "AGENT" };
    } else if (action === "REJECT") {
      data = { agentRequestStatus: "REJECTED", tier: "user", role: existing.role === "ADMIN" ? "ADMIN" : "USER" };
    } else if (action === "REVOKE") {
      data = { agentRequestStatus: "REJECTED", tier: "user", role: existing.role === "ADMIN" ? "ADMIN" : "USER" };
    } else {
      data = { agentRequestStatus: "PENDING", tier: "user", role: existing.role === "ADMIN" ? "ADMIN" : "USER" };
    }

    const updated = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        fullName: true,
        phone: true,
        tier: true,
        role: true,
        agentRequestStatus: true,
      },
    });

    logAdminAction(req, "agent_application_update", {
      targetUserId: id,
      action,
      fromTier: existing.tier,
      fromStatus: existing.agentRequestStatus,
      toTier: updated.tier,
      toStatus: updated.agentRequestStatus,
    });

    return NextResponse.json({ success: true, data: updated }, { status: 200 });
  } catch (error) {
    console.error("[ADMIN AGENTS PATCH ERROR]", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.issues[0].message }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
