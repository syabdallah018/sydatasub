import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { dispatchDeveloperWebhook } from "@/lib/webhook-dispatcher";

const updateTxSchema = z.object({
  status: z.enum(["SUCCESS", "PENDING", "FAILED", "REVERSED"]).optional(),
  description: z.string().optional(),
  externalReference: z.string().nullable().optional(),
  refundToWallet: z.boolean().optional(),
  dispatchWebhook: z.boolean().default(true),
});

/**
 * GET /api/admin/api-transactions/[id]
 */
export async function GET(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin(req);
    const { id } = await props.params;

    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            email: true,
            balance: true,
            developerProfile: {
              select: {
                id: true,
                apiKey: true,
                webhookUrl: true,
                whitelistIps: true,
                status: true,
              },
            },
          },
        },
        plan: true,
      },
    });

    if (!transaction) {
      return NextResponse.json({ success: false, error: "Transaction not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, transaction }, { status: 200 });
  } catch (error: any) {
    console.error("[ADMIN GET SINGLE API TX ERROR]", error);
    if (error.message?.includes("Unauthorized")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/api-transactions/[id]
 * Updates status, notes, externalReference, and handles optional wallet refund.
 */
export async function PATCH(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin(req);
    const { id } = await props.params;

    const body = await req.json().catch(() => ({}));
    const parsed = updateTxSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { status, description, externalReference, refundToWallet, dispatchWebhook } = parsed.data;

    const currentTx = await prisma.transaction.findUnique({
      where: { id },
      include: { user: { include: { developerProfile: true } } },
    });

    if (!currentTx) {
      return NextResponse.json({ success: false, error: "Transaction not found" }, { status: 404 });
    }

    const updateData: Record<string, any> = {};
    if (status !== undefined) updateData.status = status;
    if (description !== undefined) updateData.description = description;
    if (externalReference !== undefined) updateData.externalReference = externalReference;

    const updatedTx = await prisma.$transaction(async (tx) => {
      // If admin requested refund and transaction is not already refunded/failed
      if (refundToWallet && currentTx.userId && (status === "FAILED" || status === "REVERSED")) {
        const refundKobo = currentTx.amount * 100;
        await tx.user.update({
          where: { id: currentTx.userId },
          data: {
            balance: { increment: refundKobo },
          },
        });

        // Append refund note if not present
        const refundNote = ` [Refunded ₦${currentTx.amount} to user wallet by Admin]`;
        if (updateData.description) {
          updateData.description = `${updateData.description}${refundNote}`;
        } else {
          updateData.description = `${currentTx.description || ""}${refundNote}`;
        }
      }

      return tx.transaction.update({
        where: { id },
        data: updateData,
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              phone: true,
              email: true,
              balance: true,
              developerProfile: true,
            },
          },
          plan: true,
        },
      });
    });

    // Optionally dispatch webhook to developer
    if (dispatchWebhook && updatedTx.userId && updatedTx.user?.developerProfile?.webhookUrl) {
      const eventName =
        status === "REVERSED" || refundToWallet
          ? "transaction.refunded"
          : status === "SUCCESS"
          ? "transaction.success"
          : status === "FAILED"
          ? "transaction.failed"
          : "transaction.pending";

      dispatchDeveloperWebhook(updatedTx.userId, updatedTx, eventName);
    }

    return NextResponse.json({ success: true, transaction: updatedTx }, { status: 200 });
  } catch (error: any) {
    console.error("[ADMIN PATCH API TX ERROR]", error);
    if (error.message?.includes("Unauthorized")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: error.message || "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/api-transactions/[id]
 */
export async function DELETE(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin(req);
    const { id } = await props.params;

    const currentTx = await prisma.transaction.findUnique({
      where: { id },
    });

    if (!currentTx) {
      return NextResponse.json({ success: false, error: "Transaction not found" }, { status: 404 });
    }

    await prisma.transaction.delete({
      where: { id },
    });

    return NextResponse.json(
      { success: true, message: `Transaction ${currentTx.reference} deleted successfully` },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("[ADMIN DELETE API TX ERROR]", error);
    if (error.message?.includes("Unauthorized")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: error.message || "Internal server error" }, { status: 500 });
  }
}
