import { jwtVerify, SignJWT } from "jose";
import { NextRequest } from "next/server";
import { cookies } from "next/headers";

// Defer secret creation until first use
let cachedSecret: Uint8Array | null = null;

const getSecret = (): Uint8Array => {
  if (!cachedSecret) {
    cachedSecret = new TextEncoder().encode(
      process.env.JWT_SECRET || "your-super-secret-jwt-key-min-32-chars"
    );
  }
  return cachedSecret;
};

export interface JWTPayload {
  userId: string;
  phone?: string;
  email?: string;
  role: "USER" | "AGENT" | "ADMIN";
  [key: string]: any;
}

export async function signToken(payload: JWTPayload): Promise<string> {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(getSecret());

  return token;
}

export async function verifyToken(
  token: string
): Promise<JWTPayload | null> {
  try {
    const verified = await jwtVerify(token, getSecret());
    return verified.payload as JWTPayload;
  } catch (error) {
    return null;
  }
}

export async function getSessionUser(
  req: NextRequest
): Promise<JWTPayload | null> {
  try {
    // Try getting token from Authorization header
    const authHeader = req.headers.get("authorization");
    let token: string | null = null;

    if (authHeader?.startsWith("Bearer ")) {
      token = authHeader.slice(7);
    } else {
      // Try getting from auth_token cookie (standardized)
      const cookieStore = await cookies();
      token = cookieStore.get("auth_token")?.value || null;
    }

    if (!token) {
      return null;
    }

    return await verifyToken(token);
  } catch (error) {
    return null;
  }
}

export async function verifyAdminToken(token: string): Promise<JWTPayload | null> {
  try {
    const payload = await verifyToken(token);
    if (payload && payload.role === "ADMIN") {
      return payload;
    }
    return null;
  } catch (error) {
    return null;
  }
}
