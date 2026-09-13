"use server"

import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { markSchema, classRosterQuerySchema } from "@/lib/validations"
import { verifySession } from "@/lib/auth/session"
import { logActivity } from "./logging"
import { assertMarkEntryAuthorized, requireActiveSessionId } from "@/lib/auth/teacher-authorization"
import { logSecurityEvent } from "@/lib/auth/idor-protection"

export interface RosterStudent {
  enrollmentId: string
  studentId: string
  name: string
  email: string
  rollNumber: string | null
  classId: string
  className: string
  status: string
}

/**
 * Fetch Authorized Subject Teacher Roster
 * Joins TeachingAssignment with StudentEnrollment (status: ACTIVE) matching academicSessionId
 * instead of relying on flat student.classId fields.
 */
export async function getAuthorizedSubjectRoster(
  subjectId: string,
  classId: string
): Promise<{ success: boolean; roster?: RosterStudent[]; error?: string }> {
  try {
    // 1. Verify User Session & Role (RBAC)
    const session = await verifySession()
    if (!session || !session.isAuth || session.role !== "TEACHER") {
      return { success: false, error: "Unauthorized: Insufficient permissions for this resource." }
    }

    // 2. Validate Input Parameters
    const parseResult = classRosterQuerySchema.safeParse({ classId, subjectId })
    if (!parseResult.success) {
      return { success: false, error: "Invalid request parameters." }
    }

    // 3. Resolve Teacher Profile bound strictly to Session User ID
    const teacher = await prisma.teacher.findUnique({
      where: { userId: session.userId },
      select: { id: true },
    })

    if (!teacher) {
      return { success: false, error: "Unauthorized: Insufficient permissions for this resource." }
    }

    const activeSessionId = await requireActiveSessionId()

    // 4. Verify Active Teaching Assignment in DB (Session-Bound IDOR Check)
    const assignment = await prisma.teachingAssignment.findFirst({
      where: {
        teacherId: teacher.id,
        subjectId,
        classId,
        academicSessionId: activeSessionId,
        isActive: true,
      },
    })

    if (!assignment) {
      logSecurityEvent({
        event: "IDOR_ATTEMPT",
        userId: session.userId,
        resource: `/actions/teacher/getAuthorizedSubjectRoster`,
        details: `Teacher tried accessing unassigned classId=${classId} for subjectId=${subjectId}`,
      })
      return { success: false, error: "Unauthorized: Insufficient permissions for this resource." }
    }

    // 5. Query Active Students via Canonical StudentEnrollment Engine
    const enrollments = await prisma.studentEnrollment.findMany({
      where: {
        classId,
        academicSessionId: activeSessionId,
        status: "ACTIVE",
      },
      include: {
        class: { select: { name: true } },
        student: {
          include: {
            user: { select: { name: true, email: true } },
          },
        },
      },
      orderBy: {
        student: { user: { name: "asc" } },
      },
    })

    const roster: RosterStudent[] = enrollments.map((e) => ({
      enrollmentId: e.id,
      studentId: e.student.id,
      name: e.student.user.name || "Unknown Student",
      email: e.student.user.email,
      rollNumber: e.student.rollNumber,
      classId: e.classId,
      className: e.class.name,
      status: e.status,
    }))

    return { success: true, roster }
  } catch (error) {
    console.error("Error fetching subject roster:", error)
    return { success: false, error: "Failed to fetch student roster." }
  }
}

export async function upsertMark(formData: FormData) {
  // 1. RBAC Session Check
  const session = await verifySession()
  if (!session || session.role !== "TEACHER") {
    return { error: "Unauthorized: Insufficient permissions for this resource." }
  }

  const data = Object.fromEntries(formData.entries())
  const parsed = markSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const expectedSessionId = data.expectedSessionId as string | undefined;

  try {
    // 2. Resolve Teacher Profile bound strictly to Session User ID
    const teacherUser = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { teacher: { select: { id: true } } }
    })
    const teacherId = teacherUser?.teacher?.id
    if (!teacherId) return { error: "Unauthorized: Insufficient permissions for this resource." }

    const activeSessionId = await requireActiveSessionId()
    if (expectedSessionId && expectedSessionId !== activeSessionId) {
      return { error: "The active academic session has changed. Please reload the page." }
    }

    // 3. IDOR Assignment Verification (3-step authorization chain)
    try {
      await assertMarkEntryAuthorized(
        teacherId,
        parsed.data.studentId,
        parsed.data.subjectId,
        activeSessionId
      )
    } catch (authError: any) {
      logSecurityEvent({
        event: "IDOR_ATTEMPT",
        userId: session.userId,
        resource: `/actions/teacher/upsertMark`,
        details: authError.message,
      })
      return { error: "Unauthorized: Insufficient permissions for this resource." }
    }

    // 4. Finalized Lock Check
    const record = await prisma.studentAcademicRecord.findUnique({
      where: { studentId_academicSessionId: { studentId: parsed.data.studentId, academicSessionId: activeSessionId } }
    })
    if (record?.status === "FINALIZED") {
      return { error: "Academic record is finalized and immutable." }
    }

    // 5. Database Write
    await prisma.mark.upsert({
      where: {
        studentId_subjectId_examType_academicSessionId: {
          studentId: parsed.data.studentId,
          subjectId: parsed.data.subjectId,
          examType: parsed.data.examType,
          academicSessionId: activeSessionId,
        }
      },
      update: {
        score: parsed.data.score,
        status: parsed.data.status,
      },
      create: {
        studentId: parsed.data.studentId,
        subjectId: parsed.data.subjectId,
        teacherId: teacherId,
        examType: parsed.data.examType,
        score: parsed.data.score,
        status: parsed.data.status,
        academicSessionId: activeSessionId,
      }
    })
    
    await logActivity(
      parsed.data.status === "PUBLISHED" ? "MARK_PUBLISHED" : "MARK_DRAFTED", 
      "Mark", 
      null, 
      `Scored ${parsed.data.score} in ${parsed.data.examType}`, 
      session.userId
    )

    revalidatePath("/teacher/marks")
    revalidatePath("/teacher/class", "layout")
    revalidatePath("/student", "layout")
    return { success: true }
  } catch (error) {
    console.error("Error in upsertMark:", error)
    return { error: "Failed to save mark." }
  }
}

export async function bulkUpdateMarkStatus(markIds: string[], status: "PUBLISHED" | "DRAFT") {
  const session = await verifySession()
  if (!session || session.role !== "TEACHER") return { error: "Unauthorized" }

  if (!markIds || markIds.length === 0) {
    return { success: true }
  }

  try {
    const teacherUser = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { teacher: { select: { id: true } } }
    })
    const teacherId = teacherUser?.teacher?.id
    if (!teacherId) return { error: "Teacher profile not found" }

    const marks = await prisma.mark.findMany({
      where: { id: { in: markIds }, teacherId },
      select: { id: true, studentId: true }
    })

    if (marks.length === 0) {
      return { error: "No matching mark records found to update." }
    }

    const studentIds = [...new Set(marks.map(m => m.studentId))]

    const settings = await prisma.schoolSettings.findUnique({
      where: { id: "default" },
      select: { activeSessionId: true }
    })
    const activeSessionId = settings?.activeSessionId
    
    if (activeSessionId) {
      const finalizedRecords = await prisma.studentAcademicRecord.count({
        where: {
          studentId: { in: studentIds },
          academicSessionId: activeSessionId,
          status: "FINALIZED"
        }
      })
      if (finalizedRecords > 0) {
        return { error: "Cannot bulk update marks: one or more students have finalized academic records." }
      }
    }

    const targetMarkIds = marks.map(m => m.id)

    // Execute atomic batch transaction to update all marks and log activity in a single connection
    await prisma.$transaction([
      prisma.mark.updateMany({
        where: {
          id: { in: targetMarkIds },
          teacherId: teacherId
        },
        data: {
          status: status
        }
      }),
      prisma.activityLog.create({
        data: {
          action: status === "PUBLISHED" ? "BULK_PUBLISHED_MARKS" : "BULK_DRAFTED_MARKS",
          entityType: "Mark",
          entityId: null,
          details: `Bulk updated ${targetMarkIds.length} marks to ${status}`,
          actorId: session.userId,
        }
      })
    ])

    revalidatePath("/teacher/marks")
    revalidatePath("/teacher/class", "layout")
    revalidatePath("/student", "layout")
    return { success: true }
  } catch (error) {
    console.error("Error in bulkUpdateMarkStatus:", error)
    return { error: "Failed to batch update records." }
  }
}
