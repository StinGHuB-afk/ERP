"use server"

import { redirect } from "next/navigation"
import { headers } from "next/headers"
import prisma from "@/lib/prisma"
import { createSession, deleteSession } from "@/lib/auth/session"
import { verifyPassword, silentRehashUserPassword } from "@/lib/auth/password-crypto"
import {
  checkIpRateLimit,
  getAccountLockoutStatus,
  recordFailedLogin,
  clearFailedLoginAttempts,
  delay,
} from "@/lib/auth/rate-limiter"
import { loginSchema } from "@/lib/validations"

export async function login(formData: FormData) {
  const rawEmail = formData.get("email") as string
  const rawPassword = formData.get("password") as string

  // 1. IP-Based Rate Limiting Check (10 requests / min window)
  const headerList = await headers()
  const forwardedFor = headerList.get("x-forwarded-for")
  const clientIp = forwardedFor ? forwardedFor.split(",")[0].trim() : "127.0.0.1"

  const ipRateLimit = await checkIpRateLimit(clientIp, 10, 60)
  if (!ipRateLimit.allowed) {
    return { error: "Too many login requests from your IP. Please wait a minute before retrying." }
  }

  // 2. Input Schema Validation
  const parsed = loginSchema.safeParse({ email: rawEmail, password: rawPassword })
  if (!parsed.success) {
    return { error: "Invalid email or password." }
  }

  const { email, password } = parsed.data

  // 3. Account Lockout Check (5 failed attempts = 15-minute lock)
  const lockoutStatus = await getAccountLockoutStatus(email)
  if (lockoutStatus.isLocked) {
    const minutesLeft = Math.ceil(lockoutStatus.remainingLockoutMs / (60 * 1000))
    return { error: `Account is temporarily locked due to failed attempts. Try again in ${minutesLeft} minute(s).` }
  }

  // 4. Query User Record
  const user = await prisma.user.findUnique({
    where: { email },
  })

  // 5. Secure Cryptographic Password Verification (Bcrypt Cost Factor 12 + Constant-Time assertion)
  const isValid = user ? await verifyPassword(password, user.password) : false

  if (!user || !isValid) {
    const { progressiveDelayMs } = await recordFailedLogin(email)
    // Anti-timing side-channel delay
    await delay(Math.max(300, progressiveDelayMs))
    // Generic error response prevents username/email enumeration
    return { error: "Invalid email or password." }
  }

  // 6. Reset Failed Login Count on Successful Auth
  await clearFailedLoginAttempts(email)

  // 7. Silent Upgrade for Outdated Hashes (brings legacy hashes up to Bcrypt factor 12)
  await silentRehashUserPassword(user.id, password, user.password)

  // 8. Create Secure HttpOnly Session Cookie
  await createSession(user.id, user.role, user.mustChangePassword)

  // 9. Role-Based Navigation
  if (user.mustChangePassword) redirect("/change-password")

  if (user.role === "ADMIN") redirect("/admin")
  if (user.role === "TEACHER") redirect("/teacher")
  if (user.role === "STUDENT") redirect("/student")
  if (user.role === "PARENT") redirect("/parent")

  redirect("/")
}

export async function logout() {
  await deleteSession()
  redirect("/login")
}
