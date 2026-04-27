import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getDbCapabilities } from "@/lib/db-capabilities";
import { enforceRateLimit, rejectCrossSiteMutation } from "@/lib/security";

export async function POST(req: NextRequest) {
  try {
    const originError = rejectCrossSiteMutation(req, { requireOrigin: true });
    if (originError) return originError;

    const rateLimitError = enforceRateLimit(req, "agentApply");
    if (rateLimitError) return rateLimitError;

    const sessionUser = await getSessionUser(req);
    if (!sessionUser) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const caps = await getDbCapabilities();
    if (!caps.userAgentRequestStatus) {
      return NextResponse.json(
        { success: false, error: "Agent applications are not available until database migration is complete." },
        { status: 503 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: sessionUser.userId },
      select: { id: true, tier: true, agentRequestStatus: true },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    if (user.tier === "agent" || user.agentRequestStatus === "APPROVED") {
      return NextResponse.json({ success: false, error: "You are already an approved agent." }, { status: 400 });
    }

    if (user.agentRequestStatus === "PENDING") {
      return NextResponse.json({ success: false, error: "Your application is already pending admin approval." }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { agentRequestStatus: "PENDING" },
    });

    return NextResponse.json(
      { success: true, message: "Application sent. Waiting for admin approval." },
      { status: 200 }
    );
  } catch (error) {
    console.error("[AGENT APPLY ERROR]", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
