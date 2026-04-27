/**
 * In-memory rate limiter using sliding window counter
 * Suitable for MVP, can be replaced with Redis for production at scale
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const limiters = new Map<string, RateLimitEntry>();

export function getRateLimitKey(ip: string, endpoint: string): string {
  return `${ip}:${endpoint}`;
}

export function checkRateLimit(
  key: string,
  maxAttempts: number,
  windowMs: number
): boolean {
  const now = Date.now();
  const entry = limiters.get(key);

  if (!entry || now > entry.resetTime) {
    // Create new entry or reset
    limiters.set(key, {
      count: 1,
      resetTime: now + windowMs,
    });
    return true; // Request allowed
  }

  if (entry.count < maxAttempts) {
    entry.count++;
    return true; // Request allowed
  }

  return false; // Rate limit exceeded
}

export function getClientIp(request: Request): string {
  const headers = request.headers;
  return (
    headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    headers.get("x-real-ip") ||
    "unknown"
  );
}

// Rate limit configurations (in window milliseconds and max attempts)
export const RATE_LIMITS = {
  login: { maxAttempts: 5, windowMs: 5 * 60 * 1000 }, // 5 attempts per 5 minutes
  dataPurchase: { maxAttempts: 10, windowMs: 60 * 1000 }, // 10 attempts per minute
  airtimePurchase: { maxAttempts: 10, windowMs: 60 * 1000 }, // 10 attempts per minute
  adminMutation: { maxAttempts: 80, windowMs: 60 * 1000 }, // 80 admin writes per minute per IP
  webhook: { maxAttempts: 300, windowMs: 60 * 1000 }, // generous webhook allowance
};

/**
 * Cleanup old entries (runs in background)
 * Can be called periodically to prevent memory bloat
 */
export function cleanupOldEntries(): void {
  const now = Date.now();
  for (const [key, entry] of limiters.entries()) {
    if (now > entry.resetTime) {
      limiters.delete(key);
    }
  }
}

// Cleanup every 5 minutes
setInterval(cleanupOldEntries, 5 * 60 * 1000);
