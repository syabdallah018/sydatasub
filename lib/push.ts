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

// Cached token to avoid requesting new OAuth2 token on every call
let cachedToken: string | null = null;
let tokenExpiryTime = 0;

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

    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: jwt,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Google OAuth error: ${errText}`);
    }

    const data = await response.json();
    cachedToken = data.access_token;
    tokenExpiryTime = now + (data.expires_in || 3600);
    return cachedToken!;
  } catch (error) {
    console.error("[PUSH ERROR] Failed to fetch FCM access token:", error);
    return null;
  }
}

/**
 * Sends a push notification to a specific FCM token
 */
export async function sendPushNotification(
  fcmToken: string | null | undefined,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<boolean> {
  if (!fcmToken) {
    return false;
  }

  const credentials = getFirebaseCredentials();
  if (!credentials) return false;

  const accessToken = await getFcmAccessToken();
  if (!accessToken) return false;

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
          token: fcmToken,
          notification: {
            title,
            body,
          },
          ...(data ? { data } : {}),
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("[PUSH ERROR] Firebase API response failed:", errText);
      return false;
    }

    return true;
  } catch (error) {
    console.error("[PUSH ERROR] Failed to send notification:", error);
    return false;
  }
}

/**
 * Sends a push notification to a specific user by ID
 */
export async function sendPushToUser(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { fcmToken: true },
    });

    if (!user || !user.fcmToken) {
      return false;
    }

    return sendPushNotification(user.fcmToken, title, body, data);
  } catch (error) {
    console.error(`[PUSH ERROR] Failed to send push to user ${userId}:`, error);
    return false;
  }
}

/**
 * Sends a push notification to all users who have registered a token
 */
export async function sendPushToAll(
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<{ successCount: number; failureCount: number }> {
  try {
    const users = await prisma.user.findMany({
      where: { fcmToken: { not: null } },
      select: { id: true, fcmToken: true },
    });

    if (users.length === 0) {
      return { successCount: 0, failureCount: 0 };
    }

    const sendPromises = users.map(async (u) => {
      const success = await sendPushNotification(u.fcmToken, title, body, data);
      return success;
    });

    const results = await Promise.allSettled(sendPromises);
    let successCount = 0;
    let failureCount = 0;

    results.forEach((r) => {
      if (r.status === "fulfilled" && r.value) {
        successCount++;
      } else {
        failureCount++;
      }
    });

    return { successCount, failureCount };
  } catch (error) {
    console.error("[PUSH ERROR] Failed to broadcast push to all users:", error);
    return { successCount: 0, failureCount: 0 };
  }
}
