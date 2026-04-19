import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyTransaction } from "@/lib/flutterwave";
import { deliverGuestData } from "@/lib/data-delivery";
import { z } from "zod";

const verifySchema = z.object({
  reference: z.string().min(1, "Reference is required"),
});

async function acquireFundingLock(tx: any, reference: string) {
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`wallet:${reference}`}))`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { reference } = verifySchema.parse(body);

    const transaction = await prisma.transaction.findFirst({
      where: { reference },
    });

    if (!transaction) {
      return NextResponse.json(
        { success: false, message: "Transaction not found" },
        { status: 404 }
      );
    }

    if (transaction.status === "SUCCESS") {
      return NextResponse.json({
        success: true,
        alreadyDelivered: true,
        message: "Data has already been delivered",
        status: "SUCCESS",
      });
    }

    if (transaction.status === "FAILED") {
      return NextResponse.json({
        success: false,
        message: "Transaction failed",
        status: "FAILED",
        description: transaction.description,
      });
    }

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

        if (flwTransaction.status === "successful") {
          await prisma.transaction.update({
            where: { id: transaction.id },
            data: { flwRef: flwTransaction.flw_ref },
          });

          if (transaction.type === "DATA_PURCHASE" && transaction.planId) {
            const result = await deliverGuestData(transaction);

            return NextResponse.json({
              success: result.success,
              message: result.message,
              status: result.success ? "SUCCESS" : "FAILED",
              alreadyDelivered: false,
            });
          }

          if (transaction.type === "WALLET_FUNDING" && transaction.userId) {
            const amountInKobo = transaction.amount * 100;

            const creditResult = await prisma.$transaction(async (tx) => {
              await acquireFundingLock(tx, transaction.reference);

              const currentTransaction = await tx.transaction.findUnique({
                where: { id: transaction.id },
                select: {
                  id: true,
                  status: true,
                  balanceBefore: true,
                },
              });

              if (!currentTransaction) {
                throw new Error("Transaction not found");
              }

              if (currentTransaction.status === "SUCCESS") {
                return { alreadyProcessed: true };
              }

              const user = await tx.user.findUnique({
                where: { id: transaction.userId || "" },
                select: { balance: true },
              });

              if (!user) {
                throw new Error("User not found");
              }

              const updatedUser = await tx.user.update({
                where: { id: transaction.userId || "" },
                data: {
                  balance: { increment: amountInKobo },
                },
                select: { balance: true },
              });

              await tx.transaction.update({
                where: { id: transaction.id },
                data: {
                  status: "SUCCESS",
                  balanceBefore: currentTransaction.balanceBefore ?? user.balance,
                  balanceAfter: updatedUser.balance,
                },
              });

              return { alreadyProcessed: false };
            });

            return NextResponse.json({
              success: true,
              message: creditResult.alreadyProcessed
                ? "Deposit was already reflected in your wallet"
                : `N${transaction.amount} credited to your wallet`,
              status: "SUCCESS",
              alreadyDelivered: false,
            });
          }
        } else if (flwTransaction.status === "failed") {
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
