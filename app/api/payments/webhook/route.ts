import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/security";
import { processBillstackWebhook } from "@/lib/billstack-webhook-service";
import { verifyBillstackSignature } from "@/lib/billstack-core.mjs";

function logWebhook(stage: string, details: Record<string, unknown>) {
  console.info(
    `[BILLSTACK WEBHOOK] ${JSON.stringify({
      stage,
      at: new Date().toISOString(),
      ...details,
    })}`
  );
}

export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      provider: "billstack",
      endpoint: "/api/payments/webhook",
      at: new Date().toISOString(),
    },
    { status: 200 }
  );
}

export async function POST(req: NextRequest) {
  try {
    const rateLimitError = enforceRateLimit(req, "webhook", "billstack-webhook");
    if (rateLimitError) return rateLimitError;

    const secret = process.env.BILLSTACK_SECRET_KEY || "";
    const signature = req.headers.get("x-wiaxy-signature");

    if (!verifyBillstackSignature(signature, secret)) {
      logWebhook("signature_invalid", {
        hasSignature: Boolean(signature),
      });
      return NextResponse.json({ success: false, error: "Unauthorized webhook signature" }, { status: 401 });
    }

    const payload = await req.json();
    const event = typeof payload?.event === "string" ? payload.event : null;
    const type = typeof payload?.data?.type === "string" ? payload.data.type : null;
    const transactionReference =
      typeof payload?.data?.reference === "string" ? payload.data.reference : null;
    const interbankReference =
      typeof payload?.data?.wiaxy_ref === "string" ? payload.data.wiaxy_ref : null;
    const merchantReference =
      typeof payload?.data?.merchant_reference === "string" ? payload.data.merchant_reference : null;

    logWebhook("received", {
      event,
      type,
      transactionReference,
      interbankReference,
      merchantReference,
    });

    const result = await processBillstackWebhook(payload);

    logWebhook(result.status, {
      reason: result.reason,
      transactionReference: result.payload?.transactionReference || null,
      interbankReference: result.payload?.interbankReference || null,
      merchantReference: result.payload?.merchantReference || null,
      amount: result.payload?.amountNaira || null,
      transactionId: result.transactionId || null,
    });

    return NextResponse.json({ success: true, status: result.status, reason: result.reason }, { status: 200 });
  } catch (error: unknown) {
    logWebhook("error", { message: error instanceof Error ? error.message : "unknown_error" });
    return NextResponse.json({ success: false, error: "Webhook processing failed" }, { status: 500 });
  }
}
