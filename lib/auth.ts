import { jwtVerify, SignJWT } from "jose";
import { NextRequest } from "next/server";

function getJwtSecret() {
  const configured = process.env.JWT_SECRET;
  if (configured) return configured;
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET is not configured");
  }
  return "dev-jwt-secret-only";
}

function getSecretBytes() {
  return new TextEncoder().encode(getJwtSecret());
}

export const SESSION_COOKIE_NAME = "sy_session";
export const ADMIN_SESSION_COOKIE_NAME = "sy_admin_session";
const SESSION_TOKEN_VERSION = "2026-05-admin-hardening-v1";

function getCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  };
}

function getAdminCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    maxAge: 60 * 60 * 12,
    path: "/",
  };
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: "USER" | "AGENT" | "ADMIN";
  sv?: string;
  [key: string]: any;
}

export function isMobileClient(req: NextRequest): boolean {
  const clientHeader = req.headers.get("x-client")?.toLowerCase();
  const platformHeader = req.headers.get("x-app-platform")?.toLowerCase();
  const authHeader = req.headers.get("authorization")?.toLowerCase();
  return (
    clientHeader === "mobile" ||
    clientHeader === "mobile-web" ||
    platformHeader === "flutter" ||
    Boolean(authHeader?.startsWith("bearer "))
  );
}

export function getSessionExpiration(req: NextRequest): string {
  return isMobileClient(req) ? "90d" : "7d";
}

export async function signToken(
  payload: JWTPayload,
  expiresIn: string | number = "7d"
): Promise<string> {
  const secret = getSecretBytes();
  const token = await new SignJWT({ ...payload, sv: SESSION_TOKEN_VERSION })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secret);

  return token;
}

export async function verifyToken(
  token: string
): Promise<JWTPayload | null> {
  try {
    const secret = getSecretBytes();
    const verified = await jwtVerify(token, secret);
    const payload = verified.payload as JWTPayload;
    if (payload.role === "ADMIN" && payload.sv !== SESSION_TOKEN_VERSION) {
      return null;
    }
    return payload;
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
  response.cookies.set(ADMIN_SESSION_COOKIE_NAME, token, getAdminCookieOptions());
}

export function clearAdminSessionCookie(response: { cookies: { set: Function } }) {
  response.cookies.set(ADMIN_SESSION_COOKIE_NAME, "", {
    ...getAdminCookieOptions(),
    expires: new Date(0),
    maxAge: 0,
  });
}
