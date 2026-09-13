"use server"

import crypto from "crypto"
import prisma from "@/lib/prisma"
import { verifySession } from "@/lib/auth/session"
import { revalidatePath } from "next/cache"
import { logSecurityEvent } from "@/lib/auth/idor-protection"
import { logActivity } from "./logging"

/**
 * Generate a Cryptographically Unpredictable Verification Code
 * 32-character hex string generated using Node.js crypto.randomBytes
 */
export async function generateCryptoVerificationCode(): Promise<string> {
  return crypto.randomBytes(16).toString("hex")
}

/**
 * Finalize Report Card & Inject Cryptographic Verification Code
 */
export async function finalizeReportCardWithCryptoSignature(recordId: string) {
  const session = await verifySession()
  if (!session || (session.role !== "TEACHER" && session.role !== "ADMIN")) {
    return { error: "Unauthorized" }
  }

  const existingRecord = await prisma.studentAcademicRecord.findUnique({
    where: { id: recordId },
  })

  if (!existingRecord) return { error: "Record not found" }
  if (existingRecord.status === "FINALIZED") {
    return { error: "Record is already finalized." }
  }

  const verificationCode = await generateCryptoVerificationCode()

  const updatedRecord = await prisma.studentAcademicRecord.update({
    where: { id: recordId },
    data: {
      status: "FINALIZED",
      finalizedAt: new Date(),
      verificationCode,
      isRevoked: false,
    },
  })

  await logActivity(
    "RECORD_FINALIZED",
    "StudentAcademicRecord",
    recordId,
    `Finalized with crypto verificationCode: ${verificationCode}`,
    session.userId
  )

  revalidatePath("/teacher/class")
  revalidatePath("/student/results")
  return { success: true, verificationCode: updatedRecord.verificationCode }
}

/**
 * Administrative Revocation Action
 * Revokes a compromised or incorrectly generated report card ID,
 * invalidating all subsequent QR code scans.
 */
export async function revokeReportCard(recordId: string, reason: string) {
  const session = await verifySession()
  if (!session || session.role !== "ADMIN") {
    return { error: "Unauthorized. Admin privileges required for revocation." }
  }

  if (!reason || reason.trim().length < 5) {
    return { error: "A valid revocation reason (minimum 5 characters) is required." }
  }

  const record = await prisma.studentAcademicRecord.findUnique({
    where: { id: recordId },
  })

  if (!record) return { error: "Record not found." }

  const updated = await prisma.studentAcademicRecord.update({
    where: { id: recordId },
    data: {
      isRevoked: true,
      revokedAt: new Date(),
      revokedReason: reason.trim(),
    },
  })

  logSecurityEvent({
    event: "UNAUTHORIZED_ACCESS",
    userId: session.userId,
    resource: `/actions/verification/revokeReportCard/${recordId}`,
    details: `Admin revoked report card ID=${recordId}. Reason: ${reason}`,
  })

  await logActivity(
    "RECORD_REVOKED",
    "StudentAcademicRecord",
    recordId,
    `Revoked report card: ${reason}`,
    session.userId
  )

  revalidatePath("/admin")
  if (record.verificationCode) {
    revalidatePath(`/verify/${record.verificationCode}`)
  }
  return { success: true, revokedAt: updated.revokedAt }
}
