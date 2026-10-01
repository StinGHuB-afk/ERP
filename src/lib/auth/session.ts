import { cookies } from "next/headers"
import prisma from "@/lib/prisma"
import { Role } from "@prisma/client"
import { encrypt, decrypt, SessionPayload } from "./jwt"

export async function createSession(
  userId: string,
  role: Role | string,
  needsPasswordChange: boolean = false,
  schoolId?: string | null
) {
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
  const session = await encrypt({ userId, role, schoolId, needsPasswordChange, expiresAt })
  const cookieStore = await cookies()

  cookieStore.set("session", session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    sameSite: "lax",
    path: "/",
  })
}

export async function verifySession(allowPasswordChangeState: boolean = false) {
  try {
    const cookieStore = await cookies()
    const cookie = cookieStore.get("session")?.value
    if (!cookie) {
      return null
    }

    const session = await decrypt(cookie)

    if (!session?.userId) {
      return null
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        mustChangePassword: true,
        role: true,
        schoolId: true,
      },
    })

    if (!user) {
      return null
    }

    return {
      isAuth: true as const,
      userId: session.userId,
      role: user.role as Role,
      schoolId: user.schoolId,
      needsPasswordChange: user.mustChangePassword,
    }
  } catch (error) {
    return null
  }
}

export async function deleteSession() {
  try {
    const cookieStore = await cookies()
    cookieStore.delete("session")
  } catch (error) {
    // Ignore error if cookies cannot be accessed
  }
}

export async function getEffectiveTenantId(): Promise<string | null> {
  const session = await verifySession()
  if (!session) {
    return null
  }

  if (session.role === Role.ADMIN) {
    return session.schoolId
  }

  if (session.role === Role.SUPERADMIN) {
    const cookieStore = await cookies()
    const activeTenantId = cookieStore.get("active_tenant_id")?.value
    return activeTenantId || null
  }

  return session.schoolId ?? null
}

export { encrypt, decrypt }
export type { SessionPayload }
