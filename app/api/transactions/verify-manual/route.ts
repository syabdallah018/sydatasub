import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyTransaction } from "@/lib/flutterwave";
import { deliverGuestData } from "@/lib/data-delivery";
import { checkAndAwardRewards } from "@/lib/rewards";
import { z } from "zod";

const verifySchema = z.object({
  reference: z.string().min(1, "Reference is required"),
});

/**
 * POST /api/transactions/verify-manual
 * Body: { reference: string }
 *
 * Manual verification for guest payments
 * - If already SUCCESS: return { success: true, alreadyDelivered: true }
 * - If PENDING: check with Flutterwave, deliver if completed
 * - Return { success, message }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { reference } = verifySchema.parse(body);

    // Find transaction by reference
    const transaction = await prisma.transaction.findFirst({
      where: { reference },
    });

    if (!transaction) {
      return NextResponse.json(
        { success: false, message: "Transaction not found" },
        { status: 404 }
      );
    }

    // If already successful, return immediately
    if (transaction.status === "SUCCESS") {
      return NextResponse.json({
        success: true,
        alreadyDelivered: true,
        message: "Data has already been delivered",
        status: "SUCCESS",
      });
    }

    // If failed, return error
    if (transaction.status === "FAILED") {
      return NextResponse.json({
        success: false,
        message: "Transaction failed",
        status: "FAILED",
        description: transaction.description,
      });
    }

    // If pending, check with Flutterwave
    if (transaction.status === "PENDING") {
      try {
        const flwTransaction = await verifyTransaction(reference);

        if (!flwTransaction) {
          return NextResponse.json({
            success: false,
            message: "Payment not yet confirmed by Flutterwave",
            status: "PENDING",
          });
        }

        // Check if payment is successful
        if (flwTransaction.status === "successful") {
          // Update transaction with flw reference
          await prisma.transaction.update({
            where: { id: transaction.id },
            data: { flwRef: flwTransaction.flw_ref },
          });

          // For guest transactions, deliver data
          if (
            transaction.type === "DATA_PURCHASE" &&
            transaction.planId
          ) {
            const result = await deliverGuestData(transaction);

            return NextResponse.json({
              success: result.success,
              message: result.message,
              status: result.success ? "SUCCESS" : "FAILED",
              alreadyDelivered: false,
            });
          }

          // For wallet funding, credit balance
          if (transaction.type === "WALLET_FUNDING" && transaction.userId) {
            const amountInKobo = transaction.amount * 100;

            await prisma.$transaction(async (tx) => {
              const user = await tx.user.findUnique({
                where: { id: transaction.userId || "" },
              });

              if (!user) {
                throw new Error("User not found");
              }

              await tx.user.update({
                where: { id: transaction.userId || "" },
                data: {
                  balance: { increment: amountInKobo },
                },
              });

              await tx.transaction.update({
                where: { id: transaction.id },
                data: {
                  status: "SUCCESS",
                  balanceAfter: user.balance + amountInKobo,
                },
              });
            });

            // Award rewards
            await checkAndAwardRewards(
              transaction.userId,
              transaction.amount,
              "DEPOSIT"
            );

            return NextResponse.json({
              success: true,
              message: `₦${transaction.amount} credited to your wallet`,
              status: "SUCCESS",
              alreadyDelivered: false,
            });
          }
        } else if (flwTransaction.status === "failed") {
          // Mark as failed
          await prisma.transaction.update({
            where: { id: transaction.id },
            data: {
              status: "FAILED",
              description: "Payment failed at Flutterwave",
            },
          });

          return NextResponse.json({
            success: false,
            message: "Payment was declined",
            status: "FAILED",
          });
        }

        // Still pending at Flutterwave
        return NextResponse.json({
          success: false,
          message: "Payment still pending - please wait",
          status: "PENDING",
        });
      } catch (flwError: any) {
        console.error("[VERIFY MANUAL FLW ERROR]", flwError);

        return NextResponse.json({
          success: false,
          message: "Could not verify with payment provider",
          status: "PENDING",
        });
      }
    }

    return NextResponse.json({
      success: false,
      message: "Unknown transaction status",
      status: transaction.status,
    });
  } catch (error) {
    console.error("[VERIFY MANUAL ERROR]", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: error.issues[0].message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
