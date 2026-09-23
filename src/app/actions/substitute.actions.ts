"use server"

import prisma from "@/lib/prisma"
import { verifySession } from "@/lib/auth/session"
import { revalidatePath } from "next/cache"

export interface AssignSubstituteInput {
  substituteTeacherId: string
  classId: string
  validFrom: Date | string
  validUntil: Date | string
}

export interface ActionResult<T = any> {
  success: boolean
  data?: T
  error?: string
}

/**
 * Creates a SubstituteAssignment connecting a teacher to a class for a specified timeframe.
 * Admin-only RBAC access.
 */
export async function assignSubstitute(data: AssignSubstituteInput): Promise<ActionResult> {
  try {
    const session = await verifySession()
    if (!session || !session.isAuth || session.role !== "ADMIN") {
      return { success: false, error: "Unauthorized: Admin access required." }
    }

    const { substituteTeacherId, classId, validFrom, validUntil } = data

    if (!substituteTeacherId || !classId || !validFrom || !validUntil) {
      return { success: false, error: "Missing required fields for substitute assignment." }
    }

    const fromDate = new Date(validFrom)
    const untilDate = new Date(validUntil)

    if (isNaN(fromDate.getTime()) || isNaN(untilDate.getTime())) {
      return { success: false, error: "Invalid start or end date format." }
    }

    if (fromDate >= untilDate) {
      return { success: false, error: "Valid from date must be earlier than valid until date." }
    }

    // Verify teacher & class existence
    const teacher = await prisma.teacher.findUnique({ where: { id: substituteTeacherId } })
    if (!teacher) {
      return { success: false, error: "Substitute teacher not found." }
    }

    const targetClass = await prisma.class.findUnique({ where: { id: classId } })
    if (!targetClass) {
      return { success: false, error: "Target class not found." }
    }

    const assignment = await prisma.substituteAssignment.create({
      data: {
        substituteTeacherId,
        classId,
        assignedByAdminId: session.userId,
        validFrom: fromDate,
        validUntil: untilDate,
      },
      include: {
        substituteTeacher: {
          include: {
            user: { select: { name: true, email: true } },
          },
        },
        class: { select: { name: true } },
      },
    })

    revalidatePath(`/admin/classes`)
    revalidatePath(`/teacher/classes`)
    return { success: true, data: assignment }
  } catch (error: any) {
    console.error("Error in assignSubstitute:", error)
    return { success: false, error: error.message || "Failed to assign substitute teacher." }
  }
}

/**
 * Queries SubstituteAssignment where the current time falls between validFrom and validUntil for a class.
 * Accessible by authenticated users (Admin, Teacher, Student, Parent).
 */
export async function getActiveSubstitute(classId: string): Promise<ActionResult> {
  try {
    const session = await verifySession()
    if (!session || !session.isAuth) {
      return { success: false, error: "Unauthorized access." }
    }

    if (!classId) {
      return { success: false, error: "Class ID is required." }
    }

    const now = new Date()

    const activeAssignment = await prisma.substituteAssignment.findFirst({
      where: {
        classId,
        validFrom: { lte: now },
        validUntil: { gte: now },
      },
      include: {
        substituteTeacher: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
        class: { select: { id: true, name: true } },
        assignedByAdmin: { select: { name: true } },
      },
      orderBy: { validUntil: "desc" },
    })

    return { success: true, data: activeAssignment }
  } catch (error: any) {
    console.error("Error in getActiveSubstitute:", error)
    return { success: false, error: error.message || "Failed to fetch active substitute assignment." }
  }
}

/**
 * Lists all active and upcoming substitute assignments for a specific teacher.
 */
export async function getTeacherSubstituteAssignments(teacherId: string): Promise<ActionResult> {
  try {
    const session = await verifySession()
    if (!session || !session.isAuth) {
      return { success: false, error: "Unauthorized access." }
    }

    const now = new Date()

    const assignments = await prisma.substituteAssignment.findMany({
      where: {
        substituteTeacherId: teacherId,
        validUntil: { gte: now },
      },
      include: {
        class: { select: { id: true, name: true } },
        assignedByAdmin: { select: { name: true } },
      },
      orderBy: { validFrom: "asc" },
    })

    return { success: true, data: assignments }
  } catch (error: any) {
    console.error("Error in getTeacherSubstituteAssignments:", error)
    return { success: false, error: error.message || "Failed to fetch teacher substitute assignments." }
  }
}
