import { jwtVerify, SignJWT } from "jose";
import { NextRequest } from "next/server";
import { cookies } from "next/headers";

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || "your-super-secret-jwt-key-min-32-chars"
);

export interface JWTPayload {
  userId: string;
  email: string;
  role: "USER" | "AGENT" | "ADMIN";
  [key: string]: any;
}

export async function signToken(payload: JWTPayload): Promise<string> {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(secret);

  return token;
}

export async function verifyToken(
  token: string
): Promise<JWTPayload | null> {
  try {
    const verified = await jwtVerify(token, secret);
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
      // Try getting from sy_session cookie
      const cookieStore = await cookies();
      token = cookieStore.get("sy_session")?.value || null;
    }

    if (!token) {
      return null;
    }

    return await verifyToken(token);
  } catch (error) {
    return null;
  }
}
