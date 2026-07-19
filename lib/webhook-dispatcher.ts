import { prisma } from "@/lib/db";
import crypto from "crypto";

export interface WebhookPayload {
  event: string;
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
  };
}

export async function dispatchDeveloperWebhook(userId: string, txData: any) {
  try {
    const profile = await prisma.developerProfile.findUnique({
      where: { userId },
    });

    if (!profile || !profile.webhookUrl) {
      return;
    }

    const payload: WebhookPayload = {
      event: "transaction.updated",
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

    const bodyString = JSON.stringify(payload);
    // Generate signature using API Key as key
    const signature = crypto
      .createHmac("sha256", profile.apiKey)
      .update(bodyString)
      .digest("hex");

    console.log(`[OUTGOING WEBHOOK] Dispatching to ${profile.webhookUrl} for reference ${txData.reference}`);

    // Fire asynchronously to avoid blocking the main purchase API response
    fetch(profile.webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-SYDATA-Signature": signature,
        "X-SYDATA-Event": "transaction.updated",
      },
      body: bodyString,
    })
      .then(async (res) => {
        if (!res.ok) {
          console.error(`[OUTGOING WEBHOOK FAILED] Status: ${res.status} from ${profile.webhookUrl}`);
        }
      })
      .catch((err) => {
        console.error(`[OUTGOING WEBHOOK ERROR] Network failure: ${err.message}`);
      });
  } catch (error) {
    console.error("[OUTGOING WEBHOOK DISPATCH ERROR]", error);
  }
}
