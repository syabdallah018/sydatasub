import { prisma } from "@/lib/db";
import { sendPushNotification } from "@/lib/push";
import { purchaseDataByPlan } from "@/lib/data-provider.mjs";
import { purchaseData as purchaseFromSmeplug } from "@/lib/smeplug";
import { purchaseData as purchaseFromSaiful } from "@/lib/saiful";
import { purchaseData as purchaseFromAlrahuz } from "@/lib/alrahuz.mjs";
import { purchaseData as purchaseFromAmysub } from "@/lib/amysub";
import { purchaseData as purchaseFromDatabills } from "@/lib/databills";
import { purchaseAirtime as purchaseAirtimeAlrahuz } from "@/lib/alrahuz.mjs";
import { purchaseAirtime as purchaseAirtimeSmeplug } from "@/lib/smeplug";
import { purchaseAirtime as purchaseAirtimeSaiful } from "@/lib/saiful";
import { normalizeProviderFailureMessage } from "@/lib/purchase-utils";

const airtimeNetworkIds: Record<string, number> = {
  mtn: 1,
  "9mobile": 3,
  airtel: 4,
  glo: 2,
};

let isProcessing = false;

export async function processDueScheduledTopUps() {
  if (isProcessing) {
    return { success: true, message: "Processing already in progress" };
  }

  isProcessing = true;
  try {
    const now = new Date();
    const dueSchedules = await prisma.scheduledTopUp.findMany({
      where: {
        status: "PENDING",
        scheduledAt: { lte: now },
      },
      include: {
        user: true,
      },
      take: 20,
    });

    let processedCount = 0;

    for (const schedule of dueSchedules) {
      try {
        const user = schedule.user;
        if (!user) {
          await prisma.scheduledTopUp.update({
            where: { id: schedule.id },
            data: { status: "FAILED", failureReason: "User account not found" },
          });
          continue;
        }

        // 1. REMINDER ONLY
        if (schedule.type === "REMINDER") {
          if (user.fcmToken) {
            await sendPushNotification(
              user.fcmToken,
              "Scheduled Top-Up Reminder",
              `Reminder: Don't forget your scheduled ${schedule.category.toLowerCase()} top-up for ${schedule.phone} (${schedule.network}).`
            ).catch(() => {});
          }

          await prisma.scheduledTopUp.update({
            where: { id: schedule.id },
            data: { status: "EXECUTED" },
          });

          processedCount++;
          continue;
        }

        // 2. AUTO-PURCHASE
        if (schedule.type === "AUTO_PURCHASE") {
          if (schedule.category === "DATA") {
            if (!schedule.planId) {
              await prisma.scheduledTopUp.update({
                where: { id: schedule.id },
                data: { status: "FAILED", failureReason: "Data plan ID is missing" },
              });
              continue;
            }

            const plan = await prisma.plan.findUnique({
              where: { id: schedule.planId },
            });

            if (!plan || !plan.isActive) {
              await prisma.scheduledTopUp.update({
                where: { id: schedule.id },
                data: { status: "FAILED", failureReason: "Data plan is inactive or unavailable" },
              });
              continue;
            }

            // Determine user effective price
            const p = plan as any;
            const isAgent = user.role === "AGENT";
            const rawPrice =
              isAgent && p.agent_price != null
                ? p.agent_price
                : p.user_price ?? p.price ?? 0;

            const planPrice = Number(rawPrice) || 0;
            if (planPrice <= 0) {
              await prisma.scheduledTopUp.update({
                where: { id: schedule.id },
                data: { status: "FAILED", failureReason: "Plan price invalid or zero" },
              });
              continue;
            }

            const priceInKobo = Math.round(planPrice * 100);

            // Fresh check of user balance
            const freshUser = await prisma.user.findUnique({
              where: { id: user.id },
              select: { balance: true, fcmToken: true },
            });

            const currentBalance = freshUser?.balance || 0;
            if (currentBalance < priceInKobo) {
              const reason = `Insufficient balance (?${(currentBalance / 100).toFixed(2)}) for ?${planPrice} plan.`;
              await prisma.scheduledTopUp.update({
                where: { id: schedule.id },
                data: { status: "FAILED", failureReason: reason },
              });

              if (freshUser?.fcmToken) {
                await sendPushNotification(
                  freshUser.fcmToken,
                  "Auto Top-Up Failed",
                  `Insufficient wallet balance to auto-purchase ${plan.name} for ${schedule.phone}.`
                ).catch(() => {});
              }
              continue;
            }

            const reference = `SCHED-DATA-${user.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

            // Debit wallet and create PENDING transaction
            await prisma.$transaction(async (tx) => {
              await tx.user.update({
                where: { id: user.id },
                data: { balance: { decrement: priceInKobo } },
              });

              await tx.transaction.create({
                data: {
                  userId: user.id,
                  type: "DATA_PURCHASE",
                  amount: planPrice,
                  status: "PENDING",
                  reference,
                  description: `Auto-Scheduled: ${plan.name} (${plan.sizeLabel}) -> ${schedule.phone}`,
                  phone: schedule.phone,
                  planId: plan.id,
                  apiUsed: plan.apiSource,
                  balanceBefore: currentBalance,
                  balanceAfter: currentBalance - priceInKobo,
                },
              });
            });

            // Dispatch provider call
            const apiResult = await purchaseDataByPlan(
              plan,
              { phone: schedule.phone, reference },
              {
                API_A: purchaseFromSmeplug,
                API_B: purchaseFromSaiful,
                API_C: purchaseFromAlrahuz,
                API_D: purchaseFromAmysub,
                API_E: purchaseFromDatabills,
              }
            );

            if (apiResult.success) {
              await prisma.transaction.updateMany({
                where: { reference },
                data: {
                  status: "SUCCESS",
                  externalReference: apiResult.externalReference || undefined,
                  description: apiResult.message || `Data sent to ${schedule.phone}`,
                },
              });

              await prisma.scheduledTopUp.update({
                where: { id: schedule.id },
                data: { status: "EXECUTED" },
              });

              if (freshUser?.fcmToken) {
                await sendPushNotification(
                  freshUser.fcmToken,
                  "Auto Top-Up Delivered! ?",
                  `Your scheduled ${plan.name} for ${schedule.phone} was delivered successfully!`
                ).catch(() => {});
              }

              processedCount++;
            } else {
              // Refund wallet on failure
              await prisma.$transaction(async (tx) => {
                await tx.user.update({
                  where: { id: user.id },
                  data: { balance: { increment: priceInKobo } },
                });

                await tx.transaction.updateMany({
                  where: { reference },
                  data: {
                    status: "FAILED",
                    description: normalizeProviderFailureMessage(apiResult.message),
                  },
                });
              });

              await prisma.scheduledTopUp.update({
                where: { id: schedule.id },
                data: {
                  status: "FAILED",
                  failureReason: apiResult.message || "Provider dispatch failed",
                },
              });

              if (freshUser?.fcmToken) {
                await sendPushNotification(
                  freshUser.fcmToken,
                  "Auto Top-Up Failed",
                  `Could not deliver scheduled data for ${schedule.phone}. Wallet was refunded.`
                ).catch(() => {});
              }
            }
          } else if (schedule.category === "AIRTIME") {
            const amount = schedule.airtimeAmount || 0;
            if (amount < 50) {
              await prisma.scheduledTopUp.update({
                where: { id: schedule.id },
                data: { status: "FAILED", failureReason: "Invalid airtime amount (min ?50)" },
              });
              continue;
            }

            const amountInKobo = Math.round(amount * 100);
            const freshUser = await prisma.user.findUnique({
              where: { id: user.id },
              select: { balance: true, fcmToken: true },
            });

            const currentBalance = freshUser?.balance || 0;
            if (currentBalance < amountInKobo) {
              const reason = `Insufficient balance (?${(currentBalance / 100).toFixed(2)}) for ?${amount} airtime.`;
              await prisma.scheduledTopUp.update({
                where: { id: schedule.id },
                data: { status: "FAILED", failureReason: reason },
              });

              if (freshUser?.fcmToken) {
                await sendPushNotification(
                  freshUser.fcmToken,
                  "Auto Top-Up Failed",
                  `Insufficient wallet balance to auto-purchase ?${amount} airtime for ${schedule.phone}.`
                ).catch(() => {});
              }
              continue;
            }

            const networkKey = schedule.network.toLowerCase();
            const networkId = airtimeNetworkIds[networkKey] || 1;
            const reference = `SCHED-AIRTIME-${user.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

            const alrahuzToken = process.env.ALRAHUZ_API_TOKEN || process.env.ALRAHUZ_TOKEN || process.env.ALRAHUZ_API_KEY;
            const isSmeplugConfigured = process.env.SMEPLUG_API_KEY && !process.env.SMEPLUG_API_KEY.includes("your-");
            const isSaifulConfigured = process.env.SAIFUL_API_KEY && !process.env.SAIFUL_API_KEY.includes("your-");

            let apiUsed: "API_A" | "API_B" | "API_C" = "API_C";
            if (alrahuzToken) {
              apiUsed = "API_C";
            } else if (isSmeplugConfigured) {
              apiUsed = "API_A";
            } else if (isSaifulConfigured) {
              apiUsed = "API_B";
            }

            await prisma.$transaction(async (tx) => {
              await tx.user.update({
                where: { id: user.id },
                data: { balance: { decrement: amountInKobo } },
              });

              await tx.transaction.create({
                data: {
                  userId: user.id,
                  type: "AIRTIME_PURCHASE",
                  amount,
                  status: "PENDING",
                  reference,
                  description: `Auto-Scheduled: ?${amount} Airtime -> ${schedule.phone}`,
                  phone: schedule.phone,
                  apiUsed,
                  balanceBefore: currentBalance,
                  balanceAfter: currentBalance - amountInKobo,
                },
              });
            });

            let apiResult;
            if (apiUsed === "API_C") {
              apiResult = await purchaseAirtimeAlrahuz({
                network: networkId,
                amount,
                phone: schedule.phone,
                reference,
              });
            } else if (apiUsed === "API_A") {
              apiResult = await purchaseAirtimeSmeplug({
                networkId,
                amount,
                phone: schedule.phone,
                reference,
              });
            } else {
              apiResult = await purchaseAirtimeSaiful({
                mobileNumber: schedule.phone,
                amount,
                network: networkId,
              });
            }

            if (apiResult.success) {
              await prisma.transaction.updateMany({
                where: { reference },
                data: {
                  status: "SUCCESS",
                  externalReference: apiResult.externalReference || undefined,
                  description: `?${amount} airtime sent to ${schedule.phone}`,
                },
              });

              await prisma.scheduledTopUp.update({
                where: { id: schedule.id },
                data: { status: "EXECUTED" },
              });

              if (freshUser?.fcmToken) {
                await sendPushNotification(
                  freshUser.fcmToken,
                  "Auto Airtime Delivered! ?",
                  `Your scheduled ?${amount} airtime for ${schedule.phone} was sent successfully!`
                ).catch(() => {});
              }

              processedCount++;
            } else {
              await prisma.$transaction(async (tx) => {
                await tx.user.update({
                  where: { id: user.id },
                  data: { balance: { increment: amountInKobo } },
                });

                await tx.transaction.updateMany({
                  where: { reference },
                  data: {
                    status: "FAILED",
                    description: normalizeProviderFailureMessage(apiResult.message),
                  },
                });
              });

              await prisma.scheduledTopUp.update({
                where: { id: schedule.id },
                data: {
                  status: "FAILED",
                  failureReason: apiResult.message || "Airtime dispatch failed",
                },
              });

              if (freshUser?.fcmToken) {
                await sendPushNotification(
                  freshUser.fcmToken,
                  "Auto Top-Up Failed",
                  `Could not deliver scheduled airtime for ${schedule.phone}. Wallet was refunded.`
                ).catch(() => {});
              }
            }
          }
        }
      } catch (scheduleErr: any) {
        console.error(`[SCHEDULE ITEM ERROR] ID ${schedule.id}:`, scheduleErr);
        await prisma.scheduledTopUp.update({
          where: { id: schedule.id },
          data: { status: "FAILED", failureReason: scheduleErr?.message || "Execution exception" },
        }).catch(() => {});
      }
    }

    return { success: true, processed: processedCount, totalChecked: dueSchedules.length };
  } finally {
    isProcessing = false;
  }
}
