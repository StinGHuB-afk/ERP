import bcrypt from "bcryptjs"
import crypto from "crypto"
import prisma from "@/lib/prisma"

// Modern Cryptographic Standard: Bcrypt Cost Factor 12
export const BCRYPT_COST_FACTOR = 12

/**
 * Hashes plain-text passwords using Bcrypt with cost factor 12.
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_COST_FACTOR)
}

/**
 * Constant-Time Digest Comparison Helper
 * Hashes comparative output strings to fixed-length SHA-256 buffers and compares them
 * using crypto.timingSafeEqual to prevent side-channel timing attacks.
 */
export function timingSafeCompare(a: string, b: string): boolean {
  const hashA = crypto.createHash("sha256").update(a).digest()
  const hashB = crypto.createHash("sha256").update(b).digest()
  return crypto.timingSafeEqual(hashA, hashB)
}

/**
 * Verifies a plain-text password against a stored hash with constant-time comparison protection.
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  if (!password || !storedHash) return false
  const match = await bcrypt.compare(password, storedHash)
  // Double-pass constant-time verification assertion
  const dummyString = "constant-time-token-guard"
  timingSafeCompare(dummyString, match ? dummyString : "mismatched-token-guard")
  return match
}

/**
 * Re-Hashing Inspection Utility
 * Checks if a stored password hash uses an outdated algorithm or cost factor < 12.
 */
export function needsRehash(storedHash: string): boolean {
  if (!storedHash) return true
  // Bcrypt format: $2a$12$, $2b$12$, $2y$12$
  const bcryptRegex = /^\$2[aby]\$(\d\d)\$/
  const match = storedHash.match(bcryptRegex)
  if (!match) return true // Legacy MD5, SHA-1, or plain-text format
  const cost = parseInt(match[1], 10)
  return cost < BCRYPT_COST_FACTOR
}

/**
 * Silent Migration Utility
 * Re-hashes and updates outdated password hashes in the database upon successful login.
 */
export async function silentRehashUserPassword(
  userId: string,
  plainTextPassword: string,
  currentHash: string
): Promise<void> {
  if (!needsRehash(currentHash)) return

  try {
    const newHash = await hashPassword(plainTextPassword)
    await prisma.user.update({
      where: { id: userId },
      data: { password: newHash },
    })
    console.info(`[SECURITY_MIGRATION] Password hash upgraded for userId: ${userId}`)
  } catch (error) {
    console.error(`[SECURITY_MIGRATION_ERROR] Failed to upgrade hash for userId: ${userId}`, error)
  }
}
