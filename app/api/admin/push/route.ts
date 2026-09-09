import { NextRequest, NextResponse } from "next/server";
import { enforceAdminMutationGuard, requireAdmin } from "@/lib/adminAuth";
import { prisma } from "@/lib/db";
import { sendPushToAll } from "@/lib/push";
import { z } from "zod";

export const dynamic = "force-dynamic";

const pushSchema = z.object({
  title: z.string().min(1, "Title is required").max(100, "Title is too long"),
  body: z.string().min(1, "Body is required").max(500, "Body is too long"),
});

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);

    const totalRegisteredDevices = await prisma.user.count({
      where: { fcmToken: { not: null } },
    });

    let broadcasts: any[] = [];
    try {
      broadcasts = await prisma.pushBroadcast.findMany({
        take: 50,
        orderBy: { createdAt: "desc" },
      });
    } catch (e) {
      console.warn("[PUSH BROADCAST] Query error, defaulting to empty list:", e);
      broadcasts = [];
    }

    const totalBroadcasts = broadcasts.length;
    const totalDelivered = broadcasts.reduce((acc, b) => acc + (b.successCount || 0), 0);
    const totalFailed = broadcasts.reduce((acc, b) => acc + (b.failureCount || 0), 0);

    return NextResponse.json({
      success: true,
      stats: {
        totalBroadcasts,
        totalDelivered,
        totalFailed,
        totalRegisteredDevices,
      },
      broadcasts,
    });
  } catch (error: any) {
    console.error("[ADMIN PUSH GET ERROR]", error);
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

    await requireAdmin(req);

    const data = await req.json();
    const { title, body } = pushSchema.parse(data);

    // Count eligible device tokens in database
    const totalDevices = await prisma.user.count({
      where: { fcmToken: { not: null } },
    });

    // Dispatch push via FCM HTTP v1 OAuth2 engine
    const result = await sendPushToAll(title, body, {
      type: "ADMIN_BROADCAST",
      timestamp: new Date().toISOString(),
    });

    // Record broadcast in PushBroadcast table
    let savedBroadcast = null;
    try {
      savedBroadcast = await prisma.pushBroadcast.create({
        data: {
          title,
          body,
          target: "ALL",
          successCount: result.successCount,
          failureCount: result.failureCount,
          totalDevices,
        },
      });
    } catch (dbErr) {
      console.error("[PUSH DB LOG ERROR]", dbErr);
    }

    return NextResponse.json({
      success: true,
      message: `Push broadcast completed: ${result.successCount} succeeded, ${result.failureCount} failed (${totalDevices} devices target)`,
      stats: {
        successCount: result.successCount,
        failureCount: result.failureCount,
        totalDevices,
      },
      broadcast: savedBroadcast,
    });
  } catch (error: any) {
    console.error("[ADMIN PUSH POST ERROR]", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.issues[0].message }, { status: 400 });
    }

    if (error.message?.includes("Unauthorized")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    if (error.message?.includes("Forbidden")) {
      return NextResponse.json({ success: false, error: error.message }, { status: 403 });
    }

    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
