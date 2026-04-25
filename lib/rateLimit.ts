import { NextRequest, NextResponse } from "next/server";

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory store (use Redis in production)
const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Check rate limit for a user/endpoint combination
 * @param key Unique identifier (e.g., "user-123-purchase")
 * @param limit Max requests allowed per window
 * @param windowMs Time window in milliseconds
 * @returns true if limit exceeded, false if allowed
 */
export function checkRateLimit(
  key: string,
  limit: number = 5,
  windowMs: number = 60000 // 1 minute default
): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetTime) {
    // New window or expired
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return false; // Not limited
  }

  // Within window
  if (entry.count >= limit) {
    return true; // Limit exceeded
  }

  entry.count++;
  return false; // Still allowed
}

/**
 * Middleware-style rate limit checker with response
 */
export async function withRateLimit(
  request: NextRequest,
  userId: string,
  endpoint: string,
  options: { limit?: number; windowMs?: number } = {}
) {
  const limit = options.limit || 5;
  const windowMs = options.windowMs || 60000;
  const key = `${endpoint}:${userId}`;

  if (checkRateLimit(key, limit, windowMs)) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: { "Content-Type": "application/json; charset=utf-8" } }
    );
  }

  return null; // Not limited, proceed
}
