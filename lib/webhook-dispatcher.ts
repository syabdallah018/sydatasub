import { prisma } from "@/lib/db";
import crypto from "crypto";

export type WebhookEventType =
  | "transaction.created"
  | "transaction.pending"
  | "transaction.success"
  | "transaction.failed"
  | "transaction.refunded"
  | "balance.updated"
  | "test.webhook";

export interface WebhookPayload {
  event: WebhookEventType | string;
  timestamp: string;
  data: {
    id: string;
    reference: string;
    externalReference: string | null;
    type: string;
    status: string;
    amount: number;
    recipient: string;
    description: string | null;
    [key: string]: any;
  };
}

export interface WebhookDispatchResult {
  success: boolean;
  statusCode?: number;
  responseBody?: string;
  error?: string;
  latencyMs?: number;
}

/**
 * Dispatches a developer webhook synchronously with timeout, returning delivery result.
 */
export async function sendDeveloperWebhookDirect(
  webhookUrl: string,
  apiKey: string,
  payload: WebhookPayload
): Promise<WebhookDispatchResult> {
  const bodyString = JSON.stringify(payload);
  const timestamp = payload.timestamp || new Date().toISOString();

  // Generate signature using API Key as HMAC SHA-256 secret
  const signature = crypto
    .createHmac("sha256", apiKey)
    .update(bodyString)
    .digest("hex");

  const startTime = Date.now();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "SYDATA-Webhook/1.0",
        "X-SYDATA-Event": String(payload.event),
        "X-SYDATA-Signature": signature,
        "X-SYDATA-Timestamp": timestamp,
      },
      body: bodyString,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const latencyMs = Date.now() - startTime;
    const responseText = await res.text().catch(() => "");

    return {
      success: res.ok,
      statusCode: res.status,
      responseBody: responseText.slice(0, 500),
      latencyMs,
    };
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    return {
      success: false,
      error: err.name === "AbortError" ? "Request timeout after 10s" : err.message || "Network delivery error",
      latencyMs,
    };
  }
}

/**
 * Dispatches a developer webhook for a transaction asynchronously without blocking main flow.
 */
export async function dispatchDeveloperWebhook(
  userId: string,
  txData: any,
  customEvent?: WebhookEventType | string
): Promise<void> {
  try {
    const profile = await prisma.developerProfile.findUnique({
      where: { userId },
    });

    if (!profile || !profile.webhookUrl || profile.status !== "APPROVED") {
      return;
    }

    // Determine event name
    let eventName: string = customEvent || "transaction.updated";
    if (!customEvent) {
      if (txData.status === "SUCCESS") eventName = "transaction.success";
      else if (txData.status === "FAILED") eventName = "transaction.failed";
      else if (txData.status === "PENDING") eventName = "transaction.pending";
      else if (txData.status === "REVERSED" || txData.status === "REFUNDED") eventName = "transaction.refunded";
    }

    const payload: WebhookPayload = {
      event: eventName,
      timestamp: new Date().toISOString(),
      data: {
        id: txData.id,
        reference: txData.reference,
        externalReference: txData.externalReference || null,
        type: txData.type,
        status: txData.status,
        amount: txData.amount, // Naira
        recipient: txData.phone,
        description: txData.description || null,
      },
    };

    console.log(`[OUTGOING WEBHOOK] Event: ${eventName} -> ${profile.webhookUrl} (ref: ${txData.reference})`);

    // Fire without blocking caller
    sendDeveloperWebhookDirect(profile.webhookUrl, profile.apiKey, payload)
      .then((result) => {
        if (!result.success) {
          console.warn(`[OUTGOING WEBHOOK FAILED] Status: ${result.statusCode || "N/A"}, Error: ${result.error || "N/A"} -> ${profile.webhookUrl}`);
        } else {
          console.log(`[OUTGOING WEBHOOK SUCCESS] Status: ${result.statusCode} (${result.latencyMs}ms) -> ${profile.webhookUrl}`);
        }
      })
      .catch((err) => {
        console.error("[OUTGOING WEBHOOK EXCEPTION]", err);
      });
  } catch (error) {
    console.error("[OUTGOING WEBHOOK DISPATCH ERROR]", error);
  }
}

/**
 * Sends a test ping to developer's webhook URL.
 */
export async function testDeveloperWebhook(userId: string): Promise<WebhookDispatchResult> {
  const profile = await prisma.developerProfile.findUnique({
    where: { userId },
  });

  if (!profile) {
    return { success: false, error: "Developer profile not found" };
  }
  if (!profile.webhookUrl) {
    return { success: false, error: "No webhook URL configured in settings" };
  }

  const payload: WebhookPayload = {
    event: "test.webhook",
    timestamp: new Date().toISOString(),
    data: {
      id: "test_tx_001",
      reference: `test_ref_${Date.now()}`,
      externalReference: "TEST-PROVIDER-001",
      type: "DATA_PURCHASE",
      status: "SUCCESS",
      amount: 240,
      recipient: "08160000000",
      description: "SY DATA SUB Test Webhook Notification",
      isTest: true,
    },
  };

  return sendDeveloperWebhookDirect(profile.webhookUrl, profile.apiKey, payload);
}
