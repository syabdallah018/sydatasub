import * as jose from "jose";
import { prisma } from "./db";

export const _joseDeps = {
  importPKCS8: jose.importPKCS8,
  SignJWT: jose.SignJWT,
};

// Helper to normalize private key string from env
function getFirebaseCredentials() {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (serviceAccountJson) {
    try {
      const credentials = JSON.parse(serviceAccountJson);
      if (credentials.project_id && credentials.client_email && credentials.private_key) {
        return {
          projectId: credentials.project_id,
          clientEmail: credentials.client_email,
          privateKey: credentials.private_key.replace(/\\n/g, "\n"),
        };
      }
    } catch (e) {
      console.error("[PUSH ERROR] Failed to parse FIREBASE_SERVICE_ACCOUNT JSON:", e);
    }
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    return null;
  }

  // Handle double-escaped newlines in environment variables
  privateKey = privateKey.replace(/\\n/g, "\n");

  return { projectId, clientEmail, privateKey };
}

// Single-flight lock for token retrieval
let cachedToken: string | null = null;
let tokenExpiryTime = 0;
let pendingTokenPromise: Promise<string | null> | null = null;

async function getFcmAccessToken(): Promise<string | null> {
  const credentials = getFirebaseCredentials();
  if (!credentials) {
    console.warn("[PUSH] FCM credentials are not configured in environment variables.");
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && now < tokenExpiryTime - 60) {
    return cachedToken;
  }

  if (pendingTokenPromise) {
    return pendingTokenPromise;
  }

  pendingTokenPromise = (async () => {
    try {
      const privateKey = await _joseDeps.importPKCS8(credentials.privateKey, "RS256");
      const jwt = await new _joseDeps.SignJWT({
        iss: credentials.clientEmail,
        scope: "https://www.googleapis.com/auth/firebase.messaging",
        aud: "https://oauth2.googleapis.com/token",
        exp: now + 3600,
        iat: now - 30,
      })
        .setProtectedHeader({ alg: "RS256" })
        .sign(privateKey);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
          assertion: jwt,
        }),
        signal: controller.signal,
      }).finally(() => clearTimeout(timeout));

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Google OAuth error: ${errText}`);
      }

      const data = await response.json();
      cachedToken = data.access_token;
      tokenExpiryTime = now + (data.expires_in || 3600);
      return cachedToken;
    } catch (error) {
      console.error("[PUSH ERROR] Failed to fetch FCM access token:", error);
      return null;
    } finally {
      pendingTokenPromise = null;
    }
  })();

  return pendingTokenPromise;
}

/**
 * Sends a push notification to a specific FCM token with timeout and dead-token cleanup
 */
export async function sendPushNotification(
  fcmToken: string | null | undefined,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<boolean> {
  if (!fcmToken || typeof fcmToken !== "string" || fcmToken.trim().length === 0) {
    return false;
  }

  const credentials = getFirebaseCredentials();
  if (!credentials) return false;

  const accessToken = await getFcmAccessToken();
  if (!accessToken) return false;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);

  try {
    const url = `https://fcm.googleapis.com/v1/projects/${credentials.projectId}/messages:send`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          token: fcmToken.trim(),
          notification: {
            title,
            body,
          },
          ...(data ? { data } : {}),
        },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errText = await response.text();
      console.warn("[PUSH WARN] Firebase message send failed:", errText);

      // Clean up stale or unregistered tokens from DB to keep future sends fast
      if (
        errText.includes("UNREGISTERED") ||
        errText.includes("registration-token-not-registered") ||
        errText.includes("NOT_FOUND") ||
        response.status === 404
      ) {
        prisma.user
          .updateMany({
            where: { fcmToken },
            data: { fcmToken: null },
          })
          .catch(() => {});
      }

      return false;
    }

    return true;
  } catch (error: any) {
    if (error.name === "AbortError") {
      console.warn("[PUSH TIMEOUT] Firebase HTTP request timed out for token:", fcmToken.slice(0, 10) + "...");
    } else {
      console.error("[PUSH ERROR] Failed to send notification:", error?.message || error);
    }
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Helper to process promises in controlled concurrent chunks (e.g. 25 at a time)
 */
async function processInChunks<T, R>(
  items: T[],
  chunkSize: number,
  handler: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    const chunkResults = await Promise.all(chunk.map(handler));
    results.push(...chunkResults);
  }
  return results;
}

/**
 * Sends a push notification to a specific user by ID
 */
export async function sendPushToUser(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<{ success: boolean; hasDevice: boolean }> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { fcmToken: true },
    });

    if (!user || !user.fcmToken) {
      return { success: false, hasDevice: false };
    }

    const success = await sendPushNotification(user.fcmToken, title, body, data);
    return { success, hasDevice: true };
  } catch (error: any) {
    console.warn(`[PUSH] Could not resolve push token for user ${userId}:`, error?.message || error);
    return { success: false, hasDevice: false };
  }
}

/**
 * Sends push notifications to a targeted list of user IDs
 */
export async function sendPushToUsers(
  userIds: string[],
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<{ successCount: number; failureCount: number; totalDevices: number }> {
  try {
    const uniqueIds = Array.from(new Set(userIds.filter((id) => id && id.trim().length > 0)));
    if (uniqueIds.length === 0) {
      return { successCount: 0, failureCount: 0, totalDevices: 0 };
    }

    const users = await prisma.user.findMany({
      where: {
        id: { in: uniqueIds },
        fcmToken: { not: null },
      },
      select: { id: true, fcmToken: true },
    });

    const tokens = users.map((u) => u.fcmToken!).filter(Boolean);
    if (tokens.length === 0) {
      return { successCount: 0, failureCount: 0, totalDevices: 0 };
    }

    const sendResults = await processInChunks(tokens, 25, async (token) => {
      return await sendPushNotification(token, title, body, data);
    });

    let successCount = 0;
    let failureCount = 0;
    sendResults.forEach((res) => {
      if (res) successCount++;
      else failureCount++;
    });

    return { successCount, failureCount, totalDevices: tokens.length };
  } catch (error) {
    console.error("[PUSH ERROR] Failed to send push to users:", error);
    return { successCount: 0, failureCount: 0, totalDevices: 0 };
  }
}

/**
 * Sends a push notification to all users who have registered a device token
 */
export async function sendPushToAll(
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<{ successCount: number; failureCount: number; totalDevices: number }> {
  try {
    const users = await prisma.user.findMany({
      where: { fcmToken: { not: null } },
      select: { id: true, fcmToken: true },
    });

    const tokens = users.map((u) => u.fcmToken!).filter(Boolean);
    if (tokens.length === 0) {
      return { successCount: 0, failureCount: 0, totalDevices: 0 };
    }

    // Process in batches of 25 concurrent requests to avoid network/socket choking
    const results = await processInChunks(tokens, 25, async (token) => {
      return await sendPushNotification(token, title, body, data);
    });

    let successCount = 0;
    let failureCount = 0;
    results.forEach((success) => {
      if (success) {
        successCount++;
      } else {
        failureCount++;
      }
    });

    return { successCount, failureCount, totalDevices: tokens.length };
  } catch (error) {
    console.error("[PUSH ERROR] Failed to broadcast push to all users:", error);
    return { successCount: 0, failureCount: 0, totalDevices: 0 };
  }
}

/**
 * Sends push notifications to a list of specific FCM tokens
 */
export async function sendPushToTokens(
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<{ successCount: number; failureCount: number; totalDevices: number }> {
  try {
    const validTokens = tokens.filter((t) => typeof t === "string" && t.trim().length > 0);
    if (validTokens.length === 0) {
      return { successCount: 0, failureCount: 0, totalDevices: 0 };
    }

    const results = await processInChunks(validTokens, 25, async (token) => {
      return await sendPushNotification(token, title, body, data);
    });

    let successCount = 0;
    let failureCount = 0;
    results.forEach((success) => {
      if (success) {
        successCount++;
      } else {
        failureCount++;
      }
    });

    return { successCount, failureCount, totalDevices: validTokens.length };
  } catch (error) {
    console.error("[PUSH ERROR] Failed to send push to tokens:", error);
    return { successCount: 0, failureCount: 0, totalDevices: 0 };
  }
}

/**
 * Sends a push notification to a user by phone number
 */
export async function sendPushToPhone(
  phone: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<boolean> {
  try {
    const cleanDigits = phone.replace(/[^0-9]/g, "");
    const last10 = cleanDigits.slice(-10);
    const candidatePhones = [
      phone,
      `0${last10}`,
      `234${last10}`,
      `+234${last10}`,
      last10,
    ];

    const user = await prisma.user.findFirst({
      where: {
        phone: { in: candidatePhones },
        fcmToken: { not: null },
      },
      select: { id: true, fcmToken: true },
    });

    if (!user || !user.fcmToken) {
      console.warn(`[PUSH] No registered FCM token found for phone ${phone}`);
      return false;
    }

    return await sendPushNotification(user.fcmToken, title, body, data);
  } catch (error: any) {
    console.warn(`[PUSH] Could not send push to phone ${phone}:`, error?.message || error);
    return false;
  }
}

/**
 * Notifies admin (07068614426) when a data purchase is queued for SIM configuration
 */
export async function notifyAdminSimConfigNeeded(params: {
  phone: string;
  planName?: string;
  sizeLabel?: string;
  network?: string;
  provider?: string;
  reference: string;
}): Promise<void> {
  const adminPhone = "07068614426";
  const title = "🚨 Queued Order - SIM Config Needed";
  const body = `Data order ${params.sizeLabel || ""} ${params.network || ""} for ${params.phone} is queued on ${params.provider || "provider"}. SIM configuration required. Ref: ${params.reference}`;

  try {
    const pushSent = await sendPushToPhone(adminPhone, title, body, {
      type: "SIM_CONFIG_ALERT",
      reference: params.reference,
      provider: params.provider || "UNKNOWN",
      phone: params.phone,
    });

    if (!pushSent) {
      console.log(`[SIM CONFIG ALERT] Push logged for admin ${adminPhone} (recipient device offline or token unregistered). Msg: ${body}`);
    }
  } catch (err) {
    console.error("[SIM CONFIG ALERT] Error dispatching admin alert:", err);
  }
}

