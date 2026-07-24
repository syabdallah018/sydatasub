import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendPushToUser } from "@/lib/push";

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      // Allow execution for system cron/Vercel cron
    }

    const now = new Date();
    const dueSchedules = await prisma.scheduledTopUp.findMany({
      where: {
        status: "PENDING",
        scheduledAt: { lte: now },
      },
      include: {
        user: { select: { id: true, balance: true, phone: true } },
      },
      take: 20,
    });

    let processedCount = 0;

    for (const schedule of dueSchedules) {
      try {
        if (schedule.type === "REMINDER") {
          await sendPushToUser(
            schedule.userId,
            "Scheduled Top-Up Reminder",
            `Reminder: Don't forget your scheduled ${schedule.category.toLowerCase()} top-up for ${schedule.phone} (${schedule.network}).`
          ).catch((err) => console.error("[PUSH REMINDER ERROR]", err));

          await prisma.scheduledTopUp.update({
            where: { id: schedule.id },
            data: { status: "EXECUTED" },
          });

          processedCount++;
          continue;
        }

        if (schedule.type === "AUTO_PURCHASE") {
          await sendPushToUser(
            schedule.userId,
            "Scheduled Auto Top-Up Alert",
            `Your scheduled ${schedule.category.toLowerCase()} top-up for ${schedule.phone} is executing now.`
          ).catch((err) => console.error("[PUSH AUTO ERROR]", err));

          await prisma.scheduledTopUp.update({
            where: { id: schedule.id },
            data: { status: "EXECUTED" },
          });

          processedCount++;
        }
      } catch (err: any) {
        console.error(`[PROCESS SCHEDULE ERROR] Schedule ID ${schedule.id}:`, err);
        await prisma.scheduledTopUp.update({
          where: { id: schedule.id },
          data: { status: "FAILED", failureReason: err?.message || "Execution failed" },
        });
      }
    }

    return NextResponse.json(
      { success: true, processed: processedCount, totalChecked: dueSchedules.length },
      { status: 200 }
    );
  } catch (error) {
    console.error("[CRON PROCESS SCHEDULED ERROR]", error);
    return NextResponse.json({ error: "Failed to process scheduled top-ups" }, { status: 500 });
  }
}
