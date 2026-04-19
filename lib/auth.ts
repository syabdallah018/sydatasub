import { jwtVerify, SignJWT } from "jose";
import { NextRequest } from "next/server";

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || "your-super-secret-jwt-key-min-32-chars"
);

export const SESSION_COOKIE_NAME = "sy_session";
export const ADMIN_SESSION_COOKIE_NAME = "sy_admin_session";

function getCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  };
}

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
      token = req.cookies.get(SESSION_COOKIE_NAME)?.value || null;
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

export function setUserSessionCookie(response: { cookies: { set: Function } }, token: string) {
  response.cookies.set(SESSION_COOKIE_NAME, token, getCookieOptions());
}

export function clearUserSessionCookie(response: { cookies: { set: Function } }) {
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    ...getCookieOptions(),
    expires: new Date(0),
    maxAge: 0,
  });
}

export function setAdminSessionCookie(response: { cookies: { set: Function } }, token: string) {
  response.cookies.set(ADMIN_SESSION_COOKIE_NAME, token, getCookieOptions());
}

export function clearAdminSessionCookie(response: { cookies: { set: Function } }) {
  response.cookies.set(ADMIN_SESSION_COOKIE_NAME, "", {
    ...getCookieOptions(),
    expires: new Date(0),
    maxAge: 0,
  });
}
