"use server"

import prisma from "@/lib/prisma"
import { verifySession } from "@/lib/auth/session"
import { revalidatePath } from "next/cache"
import { ProfileUpdateStatus, ProfileEventType } from "@prisma/client"
import { requestProfileUpdate, processProfileUpdate, RequestProfileUpdateInput } from "@/app/actions/enterprise"

export interface ProfileActionResult<T = any> {
  success: boolean
  data?: T
  error?: string
}

/**
 * Modular action to submit a ProfileUpdateRequest with optional proof document URL attached.
 * Accessible by Student (self), Parent (linked child), or Admin.
 */
export async function submitProfileUpdateWithProof(
  data: RequestProfileUpdateInput
): Promise<ProfileActionResult> {
  return await requestProfileUpdate(data)
}

/**
 * Modular action to approve or reject a profile update request.
 * Accessible by Teacher or Admin.
 */
export async function reviewProfileUpdate(
  requestId: string,
  status: "APPROVED" | "REJECTED",
  rejectionReason?: string
): Promise<ProfileActionResult> {
  return await processProfileUpdate(requestId, status, rejectionReason)
}

/**
 * Fetches all pending profile update requests (with attached proof documents if present).
 * Admin and Teacher access.
 */
export async function getPendingProfileUpdatesWithProofs(): Promise<ProfileActionResult> {
  try {
    const session = await verifySession()
    if (!session || !session.isAuth || (session.role !== "ADMIN" && session.role !== "TEACHER")) {
      return { success: false, error: "Unauthorized access." }
    }

    const requests = await prisma.profileUpdateRequest.findMany({
      where: { status: ProfileUpdateStatus.PENDING },
      include: {
        student: {
          include: {
            user: { select: { name: true, email: true } },
            class: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return { success: true, data: requests }
  } catch (error: any) {
    console.error("Error in getPendingProfileUpdatesWithProofs:", error)
    return { success: false, error: error.message || "Failed to fetch pending profile updates." }
  }
}
