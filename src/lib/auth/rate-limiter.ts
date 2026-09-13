/**
 * REDIS / VERCEL KV RATE LIMITER & ACCOUNT LOCKOUT ENGINE
 *
 * Supports Upstash Redis / Vercel KV REST APIs with an in-memory
 * sliding window fallback for local development environments.
 */

// In-Memory Fallback Stores for Local Development / Serverless Warm Instances
const memoryIpStore = new Map<string, { count: number; resetAt: number }>()
const memoryLockoutStore = new Map<string, { attempts: number; lockedUntil?: number }>()

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetInSeconds: number
}

export interface LockoutStatus {
  isLocked: boolean
  remainingLockoutMs: number
  failedAttempts: number
}

/**
 * IP Rate Limiter
 * Enforces request quota per IP per window (e.g. 10 reqs/min for login, 20 reqs/min for APIs).
 */
export async function checkIpRateLimit(
  ip: string,
  limit: number = 10,
  windowSeconds: number = 60
): Promise<RateLimitResult> {
  const now = Date.now()
  const key = `rate_limit:${ip}`

  // 1. Upstash / Vercel KV Evaluation (if KV environment variables are present)
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    try {
      const res = await fetch(`${process.env.KV_REST_API_URL}/pipeline`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify([
          ["INCR", key],
          ["EXPIRE", key, windowSeconds],
        ]),
        cache: "no-store",
      })

      if (res.ok) {
        const data = await res.json()
        const currentCount = data[0]?.result || 1
        return {
          allowed: currentCount <= limit,
          remaining: Math.max(0, limit - currentCount),
          resetInSeconds: windowSeconds,
        }
      }
    } catch (e) {
      console.warn("KV Rate Limiter failed, using memory fallback", e)
    }
  }

  // 2. In-Memory Sliding Window Fallback
  const record = memoryIpStore.get(key)

  if (!record || now > record.resetAt) {
    memoryIpStore.set(key, { count: 1, resetAt: now + windowSeconds * 1000 })
    return { allowed: true, remaining: limit - 1, resetInSeconds: windowSeconds }
  }

  record.count += 1
  const remaining = Math.max(0, limit - record.count)
  const resetInSeconds = Math.ceil((record.resetAt - now) / 1000)

  return {
    allowed: record.count <= limit,
    remaining,
    resetInSeconds,
  }
}

/**
 * Account Lockout Status Check
 * Returns whether an email account is locked (15 minutes lockout after 5 consecutive failures).
 */
export async function getAccountLockoutStatus(email: string): Promise<LockoutStatus> {
  const now = Date.now()
  const normalizedEmail = email.toLowerCase().trim()
  const record = memoryLockoutStore.get(normalizedEmail)

  if (!record) {
    return { isLocked: false, remainingLockoutMs: 0, failedAttempts: 0 }
  }

  if (record.lockedUntil && now < record.lockedUntil) {
    return {
      isLocked: true,
      remainingLockoutMs: record.lockedUntil - now,
      failedAttempts: record.attempts,
    }
  }

  // Lockout expired: reset lock window
  if (record.lockedUntil && now >= record.lockedUntil) {
    memoryLockoutStore.delete(normalizedEmail)
    return { isLocked: false, remainingLockoutMs: 0, failedAttempts: 0 }
  }

  return { isLocked: false, remainingLockoutMs: 0, failedAttempts: record.attempts }
}

/**
 * Record Failed Login Attempt & Calculate Progressive Delay
 * Locks account for 15 minutes (900,000 ms) after 5 consecutive failed attempts.
 */
export async function recordFailedLogin(email: string): Promise<{ progressiveDelayMs: number }> {
  const now = Date.now()
  const normalizedEmail = email.toLowerCase().trim()
  const record = memoryLockoutStore.get(normalizedEmail) || { attempts: 0 }

  record.attempts += 1

  // 5 consecutive failed attempts = 15-minute lock (15 * 60 * 1000 ms)
  if (record.attempts >= 5) {
    record.lockedUntil = now + 15 * 60 * 1000
  }

  memoryLockoutStore.set(normalizedEmail, record)

  // Progressive delay: 300ms, 600ms, 900ms, 1200ms...
  const progressiveDelayMs = record.attempts * 300
  return { progressiveDelayMs }
}

/**
 * Clear Failed Attempts on Successful Login
 */
export async function clearFailedLoginAttempts(email: string): Promise<void> {
  const normalizedEmail = email.toLowerCase().trim()
  memoryLockoutStore.delete(normalizedEmail)
}

/**
 * Utility Helper: Progressive Delay Sleep
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
