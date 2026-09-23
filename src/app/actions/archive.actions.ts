"use server"

import prisma from "@/lib/prisma"
import { verifySession } from "@/lib/auth/session"
import { revalidatePath } from "next/cache"
import { Role } from "@prisma/client"

export interface ArchiveUserResult {
  success: boolean
  error?: string
}

/**
 * Archives a User and their linked Student or Teacher record (Soft Delete).
 * Admin-only RBAC access. Uses a Prisma transaction to ensure atomic archiving.
 */
export async function archiveUser(userId: string, role: Role): Promise<ArchiveUserResult> {
  try {
    const session = await verifySession()
    if (!session || !session.isAuth || session.role !== "ADMIN") {
      return { success: false, error: "Unauthorized: Admin access required." }
    }

    if (!userId) {
      return { success: false, error: "User ID is required." }
    }

    const userExists = await prisma.user.findUnique({
      where: { id: userId },
      include: { student: true, teacher: true },
    })

    if (!userExists) {
      return { success: false, error: "User record not found." }
    }

    await prisma.$transaction(async (tx) => {
      // 1. Soft delete User
      await tx.user.update({
        where: { id: userId },
        data: { isArchived: true },
      })

      // 2. Soft delete corresponding Student or Teacher record if present
      if (role === Role.STUDENT || userExists.student) {
        await tx.student.updateMany({
          where: { userId },
          data: { isArchived: true },
        })
      }

      if (role === Role.TEACHER || userExists.teacher) {
        await tx.teacher.updateMany({
          where: { userId },
          data: { isArchived: true },
        })
      }
    })

    revalidatePath("/admin/users")
    revalidatePath("/admin/students")
    revalidatePath("/admin/teachers")
    return { success: true }
  } catch (error: any) {
    console.error("Error in archiveUser:", error)
    return { success: false, error: error.message || "Failed to archive user." }
  }
}
