// In-memory rate limiting store
// In production, use Redis or similar
interface RateLimitEntry {
  count: number;
  resetAt: number;
  lockedUntil?: number;
}

const store = new Map<string, RateLimitEntry>();

const MAX_ATTEMPTS = parseInt(process.env.RATE_LIMIT_MAX_ATTEMPTS || "5");
const WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000"); // 15 minutes
const LOCKOUT_MS = 3600000; // 1 hour after max attempts

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  lockedUntil?: number;
}

export function checkRateLimit(identifier: string): RateLimitResult {
  const now = Date.now();
  const entry = store.get(identifier);

  // Clean up expired entries
  if (entry && entry.resetAt < now && !entry.lockedUntil) {
    store.delete(identifier);
  }

  // Check if locked out
  if (entry?.lockedUntil && entry.lockedUntil > now) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.lockedUntil,
      lockedUntil: entry.lockedUntil,
    };
  }

  // Clear lockout if expired
  if (entry?.lockedUntil && entry.lockedUntil <= now) {
    store.delete(identifier);
    return {
      allowed: true,
      remaining: MAX_ATTEMPTS - 1,
      resetAt: now + WINDOW_MS,
    };
  }

  if (!entry || entry.resetAt < now) {
    // First attempt or window expired
    store.set(identifier, {
      count: 1,
      resetAt: now + WINDOW_MS,
    });

    return {
      allowed: true,
      remaining: MAX_ATTEMPTS - 1,
      resetAt: now + WINDOW_MS,
    };
  }

  // Increment attempt count
  entry.count += 1;

  if (entry.count > MAX_ATTEMPTS) {
    // Lock out the user
    entry.lockedUntil = now + LOCKOUT_MS;
    store.set(identifier, entry);

    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.lockedUntil,
      lockedUntil: entry.lockedUntil,
    };
  }

  store.set(identifier, entry);

  return {
    allowed: true,
    remaining: MAX_ATTEMPTS - entry.count,
    resetAt: entry.resetAt,
  };
}

export function resetRateLimit(identifier: string): void {
  store.delete(identifier);
}

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt < now && (!entry.lockedUntil || entry.lockedUntil < now)) {
      store.delete(key);
    }
  }
}, 60000); // Clean up every minute
