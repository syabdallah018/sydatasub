/**
 * Simple in-memory rate limiter for authentication endpoints
 * Tracks failed attempts per phone number with sliding window
 */

interface RateLimitRecord {
  attempts: number;
  firstAttempt: number;
  lastAttempt: number;
}

// In-memory store: key is "${phone}:${endpoint}"
const rateLimitStore = new Map<string, RateLimitRecord>();

// Clean up old entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  const expiry = 15 * 60 * 1000; // 15 minute window
  for (const [key, record] of rateLimitStore.entries()) {
    if (now - record.firstAttempt > expiry) {
      rateLimitStore.delete(key);
    }
  }
}, 10 * 60 * 1000);

export interface RateLimitOptions {
  maxAttempts: number;
  windowMs: number; // Time window in milliseconds
}

/**
 * Check if a request should be rate limited
 * @param identifier Unique identifier (e.g., phone number for auth)
 * @param endpoint API endpoint name (e.g., "login", "signup")
 * @param options Rate limit configuration
 * @returns { allowed: boolean, remaining: number, resetTime: number | null }
 */
export function checkRateLimit(
  identifier: string,
  endpoint: string,
  options: RateLimitOptions = { maxAttempts: 5, windowMs: 15 * 60 * 1000 }
): {
  allowed: boolean;
  remaining: number;
  resetTime: number | null;
} {
  const key = `${identifier}:${endpoint}`;
  const now = Date.now();
  const record = rateLimitStore.get(key);

  // No record yet - this is the first attempt
  if (!record) {
    rateLimitStore.set(key, {
      attempts: 1,
      firstAttempt: now,
      lastAttempt: now,
    });
    return {
      allowed: true,
      remaining: options.maxAttempts - 1,
      resetTime: null,
    };
  }

  // Check if window has expired
  if (now - record.firstAttempt > options.windowMs) {
    // Window expired - reset
    rateLimitStore.set(key, {
      attempts: 1,
      firstAttempt: now,
      lastAttempt: now,
    });
    return {
      allowed: true,
      remaining: options.maxAttempts - 1,
      resetTime: null,
    };
  }

  // Within window - increment attempts
  record.attempts++;
  record.lastAttempt = now;
  rateLimitStore.set(key, record);

  const remaining = Math.max(0, options.maxAttempts - record.attempts);
  const resetTime = record.firstAttempt + options.windowMs;

  return {
    allowed: record.attempts <= options.maxAttempts,
    remaining,
    resetTime: record.attempts > options.maxAttempts ? resetTime : null,
  };
}

/**
 * Reset rate limit for an identifier
 * Call this after successful authentication
 */
export function resetRateLimit(identifier: string, endpoint: string): void {
  const key = `${identifier}:${endpoint}`;
  rateLimitStore.delete(key);
}
