import { NextRequest, NextResponse } from "next/server";
import { enforceAdminMutationGuard, requireAdmin } from "@/lib/adminAuth";
import { prisma } from "@/lib/db";
import { sendPushNotification, sendPushToAll, sendPushToUsers } from "@/lib/push";
import { z } from "zod";

export const dynamic = "force-dynamic";

const pushSchema = z.object({
  title: z.string().min(1, "Title is required").max(100, "Title is too long"),
  body: z.string().min(1, "Body is required").max(500, "Body is too long"),
  target: z.enum(["ALL", "INDIVIDUAL", "SELECTED"]).default("ALL"),
  targetPhone: z.string().optional(),
  targetUserId: z.string().optional(),
  targetUserIds: z.array(z.string()).optional(),
});

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");

    // Autocomplete / Search users for targeting
    if (action === "searchUsers") {
      const q = (searchParams.get("query") || "").trim();
      if (!q) {
        return NextResponse.json({ success: true, users: [] });
      }

      const users = await prisma.user.findMany({
        where: {
          OR: [
            { phone: { contains: q, mode: "insensitive" } },
            { fullName: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
          ],
        },
        take: 15,
        orderBy: { joinedAt: "desc" },
        select: {
          id: true,
          fullName: true,
          phone: true,
          email: true,
          fcmToken: true,
        },
      });

      const formatted = users.map((u) => ({
        id: u.id,
        fullName: u.fullName || "Unnamed User",
        phone: u.phone,
        email: u.email,
        hasDevice: Boolean(u.fcmToken && u.fcmToken.trim().length > 0),
      }));

      return NextResponse.json({ success: true, users: formatted });
    }

    // Default: Return dashboard stats and broadcast history
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
    const { title, body, target, targetPhone, targetUserId, targetUserIds } = pushSchema.parse(data);

    let successCount = 0;
    let failureCount = 0;
    let totalDevices = 0;
    let targetLabel = "ALL";

    if (target === "INDIVIDUAL") {
      let user = null;
      if (targetUserId) {
        user = await prisma.user.findUnique({
          where: { id: targetUserId },
          select: { id: true, fullName: true, phone: true, fcmToken: true },
        });
      } else if (targetPhone) {
        const cleanDigits = targetPhone.replace(/[^0-9]/g, "");
        const last10 = cleanDigits.slice(-10);
        const candidates = [targetPhone, `0${last10}`, `234${last10}`, `+234${last10}`, last10];
        user = await prisma.user.findFirst({
          where: { phone: { in: candidates } },
          select: { id: true, fullName: true, phone: true, fcmToken: true },
        });
      }

      if (!user) {
        return NextResponse.json(
          { success: false, error: "Specified user could not be found." },
          { status: 404 }
        );
      }

      if (!user.fcmToken) {
        return NextResponse.json(
          {
            success: false,
            error: `User ${user.fullName || user.phone} has not installed or logged into the mobile app yet (no active device token).`,
          },
          { status: 400 }
        );
      }

      totalDevices = 1;
      targetLabel = `Individual: ${user.fullName || user.phone}`;

      const sent = await sendPushNotification(user.fcmToken, title, body, {
        type: "ADMIN_DIRECT_MESSAGE",
        timestamp: new Date().toISOString(),
      });

      if (sent) {
        successCount = 1;
      } else {
        failureCount = 1;
      }
    } else if (target === "SELECTED") {
      if (!targetUserIds || targetUserIds.length === 0) {
        return NextResponse.json(
          { success: false, error: "Please select at least one recipient user." },
          { status: 400 }
        );
      }

      targetLabel = `Selected: ${targetUserIds.length} user(s)`;

      const result = await sendPushToUsers(targetUserIds, title, body, {
        type: "ADMIN_GROUP_MESSAGE",
        timestamp: new Date().toISOString(),
      });

      successCount = result.successCount;
      failureCount = result.failureCount;
      totalDevices = result.totalDevices;

      if (totalDevices === 0) {
        return NextResponse.json(
          {
            success: false,
            error: "None of the selected users have active mobile app device tokens.",
          },
          { status: 400 }
        );
      }
    } else {
      // Broadcast to all active devices
      targetLabel = "ALL";
      const result = await sendPushToAll(title, body, {
        type: "ADMIN_BROADCAST",
        timestamp: new Date().toISOString(),
      });

      successCount = result.successCount;
      failureCount = result.failureCount;
      totalDevices = result.totalDevices;
    }

    // Record broadcast in PushBroadcast table
    let savedBroadcast = null;
    try {
      savedBroadcast = await prisma.pushBroadcast.create({
        data: {
          title,
          body,
          target: targetLabel,
          successCount,
          failureCount,
          totalDevices,
        },
      });
    } catch (dbErr) {
      console.error("[PUSH DB LOG ERROR]", dbErr);
    }

    return NextResponse.json({
      success: true,
      message: `Push notification dispatched: ${successCount} delivered, ${failureCount} failed (${totalDevices} active device${totalDevices === 1 ? "" : "s"} reached)`,
      stats: {
        successCount,
        failureCount,
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
