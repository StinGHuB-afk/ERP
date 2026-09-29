import { jwtVerify, SignJWT } from "jose"
import { Role } from "@prisma/client"

const secretKey = process.env.JWT_SECRET || "school_erp_default_jwt_fallback_secret_key_2026"
const key = new TextEncoder().encode(secretKey)

export type SessionPayload = {
  userId: string
  role: Role | string
  schoolId?: string | null
  needsPasswordChange?: boolean
  expiresAt: Date
}

export async function encrypt(payload: SessionPayload) {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(key)
}

export async function decrypt(session: string | undefined = "") {
  try {
    const { payload } = await jwtVerify(session, key, {
      algorithms: ["HS256"],
    })
    return payload as SessionPayload
  } catch {
    return null
  }
}
