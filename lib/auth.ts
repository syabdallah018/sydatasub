import { jwtVerify, SignJWT } from "jose";
import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";

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

    const jwtPayload = await verifyToken(token);
    if (jwtPayload) {
      return jwtPayload;
    }

    const user = await prisma.user.findUnique({
      where: { id: token },
      select: {
        id: true,
        phone: true,
        role: true,
      },
    });

    if (!user) {
      return null;
    }

    return {
      userId: user.id,
      email: user.phone,
      role: user.role,
    };
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
