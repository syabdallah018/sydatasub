import { prisma } from "@/lib/db";
import { sendPushNotification } from "@/lib/push";

let isProcessing = false;

export async function processDueScheduledTopUps() {
  if (isProcessing) {
    return { success: true, message: "Processing already in progress" };
  }

  isProcessing = true;
  try {
    const now = new Date();
    const dueReminders = await prisma.scheduledTopUp.findMany({
      where: {
        status: "PENDING",
        scheduledAt: { lte: now },
      },
      include: {
        user: { select: { id: true, fcmToken: true, phone: true } },
      },
      take: 50,
    });

    let processedCount = 0;

    for (const reminder of dueReminders) {
      try {
        const user = reminder.user;
        if (user?.fcmToken) {
          const detail =
            reminder.category === "DATA"
              ? "data top-up"
              : `?${reminder.airtimeAmount || 0} airtime recharge`;

          await sendPushNotification(
            user.fcmToken,
            "? Top-Up Reminder",
            `Reminder: It's time for your scheduled ${reminder.network} ${detail} for ${reminder.phone}!`
          ).catch((e) => console.warn("[REMINDER PUSH ERROR]", e));
        }

        await prisma.scheduledTopUp.update({
          where: { id: reminder.id },
          data: { status: "EXECUTED" },
        });

        processedCount++;
      } catch (itemErr: any) {
        console.error(`[REMINDER ITEM ERROR] ID ${reminder.id}:`, itemErr);
        await prisma.scheduledTopUp.update({
          where: { id: reminder.id },
          data: { status: "FAILED", failureReason: itemErr?.message || "Execution exception" },
        }).catch(() => {});
      }
    }

    return { success: true, processed: processedCount, totalChecked: dueReminders.length };
  } finally {
    isProcessing = false;
  }
}
