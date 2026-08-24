import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { prisma } from "@/lib/db";
import { sendDeveloperWebhookDirect, WebhookPayload } from "@/lib/webhook-dispatcher";

/**
 * POST /api/admin/api-transactions/[id]/retry-webhook
 * Re-dispatches webhook event directly to developer's registered webhook URL with live delivery stats
 */
export async function POST(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin(req);
    const { id } = await props.params;

    const tx = await prisma.transaction.findUnique({
      where: { id },
      include: {
        user: {
          include: {
            developerProfile: true,
          },
        },
        plan: true,
      },
    });

    if (!tx) {
      return NextResponse.json({ success: false, error: "Transaction not found" }, { status: 404 });
    }

    const devProfile = tx.user?.developerProfile;
    if (!devProfile) {
      return NextResponse.json(
        { success: false, error: "User does not have an associated developer profile" },
        { status: 400 }
      );
    }

    if (!devProfile.webhookUrl) {
      return NextResponse.json(
        { success: false, error: "Developer does not have a webhook URL configured" },
        { status: 400 }
      );
    }

    let eventName = "transaction.updated";
    if (tx.status === "SUCCESS") eventName = "transaction.success";
    else if (tx.status === "FAILED") eventName = "transaction.failed";
    else if (tx.status === "PENDING") eventName = "transaction.pending";
    else if (tx.status === "REVERSED") eventName = "transaction.refunded";

    const payload: WebhookPayload = {
      event: eventName,
      timestamp: new Date().toISOString(),
      data: {
        id: tx.id,
        reference: tx.reference,
        externalReference: tx.externalReference || null,
        type: tx.type,
        status: tx.status,
        amount: tx.amount,
        recipient: tx.phone,
        description: tx.description || null,
      },
    };

    const deliveryResult = await sendDeveloperWebhookDirect(
      devProfile.webhookUrl,
      devProfile.apiKey,
      payload
    );

    if (!deliveryResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: deliveryResult.error || `Webhook delivery failed with HTTP ${deliveryResult.statusCode}`,
          statusCode: deliveryResult.statusCode,
          latencyMs: deliveryResult.latencyMs,
          responseBody: deliveryResult.responseBody,
          webhookUrl: devProfile.webhookUrl,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: `Webhook re-dispatched successfully to ${devProfile.webhookUrl} (HTTP ${deliveryResult.statusCode})`,
        statusCode: deliveryResult.statusCode,
        latencyMs: deliveryResult.latencyMs,
        responseBody: deliveryResult.responseBody,
        webhookUrl: devProfile.webhookUrl,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("[ADMIN RETRY WEBHOOK ERROR]", error);
    if (error.message?.includes("Unauthorized")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
