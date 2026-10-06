"use server"

import { redirect } from "next/navigation"
import { headers } from "next/headers"
import prisma from "@/lib/prisma"
import { createSession, deleteSession } from "@/lib/auth/session"
import { verifyPassword, silentRehashUserPassword } from "@/lib/auth/password-crypto"
import { checkIpRateLimit, delay, getAccountLockoutStatus, recordFailedLogin, clearFailedLoginAttempts } from "@/lib/auth/rate-limiter"
import { loginSchema } from "@/lib/validations"
import { Role } from "@prisma/client"

export async function login(formData: FormData) {
  const rawEmail = formData.get("email") as string
  const rawPassword = formData.get("password") as string

  // 1. IP Rate Limit Guard
  const headerList = await headers()
  const forwardedFor = headerList.get("x-forwarded-for")
  const clientIp = forwardedFor ? forwardedFor.split(",")[0].trim() : "127.0.0.1"

  const ipRateLimit = await checkIpRateLimit(clientIp, 10, 60)
  if (!ipRateLimit.allowed) {
    return { error: "Too many login requests from your IP. Please wait a minute before retrying." }
  }

  // 2. Schema Validation
  const parsed = loginSchema.safeParse({ email: rawEmail, password: rawPassword })
  if (!parsed.success) return { error: "Invalid email or password." }

  const { email, password } = parsed.data

  // 2.5 In-Memory Lockout Check (Pre-DB)
  const lockoutStatus = await getAccountLockoutStatus(email)
  if (lockoutStatus.isLocked) {
    const minutesLeft = Math.max(1, Math.ceil(lockoutStatus.remainingLockoutMs / 60000))
    return { error: `Account is locked due to multiple failed attempts. Try again in ${minutesLeft} minute(s).` }
  }

  // 3. User Resolution
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    const { progressiveDelayMs } = await recordFailedLogin(email)
    await delay(progressiveDelayMs || 300)
    return { error: "Invalid email or password." }
  }

  // 4. Early Account Lockout Check Guard
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const minutesLeft = Math.max(1, Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000))
    return { error: `Account is locked due to multiple failed attempts. Try again in ${minutesLeft} minute(s).` }
  }

  // 5. Cryptographic Password Verification
  const isValid = await verifyPassword(password, user.password)

  // 6. Handle Password Failure (Increment attempts, Lock at 5 attempts)
  if (!isValid) {
    const newAttempts = (user.failedLoginAttempts || 0) + 1
    const isLocking = newAttempts >= 5

    const { progressiveDelayMs } = await recordFailedLogin(email)

    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: newAttempts,
        lockedUntil: isLocking ? new Date(Date.now() + 15 * 60 * 1000) : null,
      },
    })

    await delay(progressiveDelayMs)
    return {
      error: isLocking
        ? "Account is now locked for 15 minutes due to 5 failed login attempts."
        : "Invalid email or password.",
    }
  }

  // 7. Reset Lockout & Counters on Auth Success
  await clearFailedLoginAttempts(email)
  if (user.failedLoginAttempts > 0 || user.lockedUntil) {
    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    })
  }

  // 8. Rehash & Session Creation
  await silentRehashUserPassword(user.id, password, user.password)
  await createSession(user.id, user.role, user.mustChangePassword, user.schoolId)

  const callbackUrl = formData.get("callbackUrl") as string | null

  // 9. Navigation
  if (user.mustChangePassword) redirect("/change-password")
  
  if (callbackUrl) {
    try {
      const parsedUrl = new URL(callbackUrl, "http://localhost") // Base doesn't matter for relative paths
      if (parsedUrl.pathname.startsWith("/")) {
        redirect(`${parsedUrl.pathname}${parsedUrl.search}`)
      }
    } catch {
      // Ignore URL parsing errors and fallback to role-based routing
    }
  }

  if (user.role === Role.SUPERADMIN) redirect("/superadmin")
  if (user.role === Role.ADMIN) redirect("/admin")
  if (user.role === Role.TEACHER) redirect("/teacher")
  if (user.role === Role.STUDENT) redirect("/student")
  if (user.role === Role.PARENT) redirect("/parent")
  if (user.role === Role.LIBRARIAN) redirect("/librarian")

  redirect("/")
}

export async function logout() {
  await deleteSession()
  redirect("/login")
}
