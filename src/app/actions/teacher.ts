"use server"

import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { markSchema, classRosterQuerySchema } from "@/lib/validations"
import { verifySession } from "@/lib/auth/session"
import { logActivity, verifyTeacherAccess } from "@/lib/audit"
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

async function requireTeacherSession() {
  const session = await verifySession()
  if (!session || !session.isAuth || session.role !== "TEACHER") return null
  return session
}

async function getTeacherId(userId: string) {
  const teacher = await prisma.teacher.findUnique({ where: { userId }, select: { id: true } })
  return teacher?.id ?? null
}

export async function getPaginatedMarks(page = 1, limit = 10, subjectId?: string, query?: string) {
  const session = await requireTeacherSession()
  if (!session) return { error: "Unauthorized", data: [], total: 0 }

  const teacherId = await getTeacherId(session.userId)
  if (!teacherId) return { error: "Teacher profile not found", data: [], total: 0 }

  const activeSessionId = await requireActiveSessionId()
  const where: any = {
    teacherId,
    academicSessionId: activeSessionId,
    ...(subjectId && subjectId !== "all" ? { subjectId } : {}),
    ...(query ? { student: { user: { name: { contains: query } } } } : {}),
  }

  const [data, total] = await Promise.all([
    prisma.mark.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      include: { student: { include: { user: true } }, subject: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.mark.count({ where }),
  ])

  return { success: true, data, total, page, totalPages: Math.ceil(total / limit) }
}

export async function getAuthorizedSubjectRoster(
  subjectId: string,
  classId: string
): Promise<{ success: boolean; roster?: RosterStudent[]; error?: string }> {
  try {
    const session = await requireTeacherSession()
    if (!session) return { success: false, error: "Unauthorized: Insufficient permissions for this resource." }

    const parseResult = classRosterQuerySchema.safeParse({ classId, subjectId })
    if (!parseResult.success) return { success: false, error: "Invalid request parameters." }

    const teacherId = await getTeacherId(session.userId)
    if (!teacherId) return { success: false, error: "Unauthorized: Insufficient permissions for this resource." }

    const activeSessionId = await requireActiveSessionId()

    const assignment = await prisma.teachingAssignment.findFirst({
      where: { teacherId, subjectId, classId, academicSessionId: activeSessionId, isActive: true },
      select: { id: true },
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

    const enrollments = await prisma.studentEnrollment.findMany({
      where: { classId, academicSessionId: activeSessionId, status: "ACTIVE" },
      include: { class: { select: { name: true } }, student: { include: { user: { select: { name: true, email: true } } } } },
      orderBy: { student: { user: { name: "asc" } } },
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
  const session = await requireTeacherSession()
  if (!session) return { error: "Unauthorized: Insufficient permissions for this resource." }

  const parsed = markSchema.safeParse(Object.fromEntries(formData.entries()))
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const expectedSessionId = formData.get("expectedSessionId") as string | null

  try {
    const teacherId = await getTeacherId(session.userId)
    if (!teacherId) return { error: "Unauthorized: Insufficient permissions for this resource." }

    const activeSessionId = await requireActiveSessionId()
    if (expectedSessionId && expectedSessionId !== activeSessionId) {
      return { error: "The active academic session has changed. Please reload the page." }
    }

    const authResult = await assertMarkEntryAuthorized(teacherId, parsed.data.studentId, parsed.data.subjectId, activeSessionId).catch((err) => {
      logSecurityEvent({
        event: "IDOR_ATTEMPT",
        userId: session.userId,
        resource: `/actions/teacher/upsertMark`,
        details: err.message,
      })
      return null
    })

    if (!authResult) return { error: "Unauthorized: Insufficient permissions for this resource." }

    // Step A: Await ABAC Guard Clause
    await verifyTeacherAccess(session.userId, authResult.classId, parsed.data.subjectId)

    const record = await prisma.studentAcademicRecord.findUnique({
      where: { studentId_academicSessionId: { studentId: parsed.data.studentId, academicSessionId: activeSessionId } },
      select: { status: true },
    })
    if (record?.status === "FINALIZED") return { error: "Academic record is finalized and immutable." }

    const activeSession = await prisma.academicSession.findUnique({
      where: { id: activeSessionId },
      select: { isMarksPublished: true },
    })
    if (activeSession?.isMarksPublished) return { error: "Marks for this academic session have been published and are now immutable." }

    const existingMark = await prisma.mark.findUnique({
      where: {
        studentId_subjectId_examType_academicSessionId: {
          studentId: parsed.data.studentId,
          subjectId: parsed.data.subjectId,
          examType: parsed.data.examType,
          academicSessionId: activeSessionId,
        },
      },
    })

    const markUpsertPromise = prisma.mark.upsert({
      where: {
        studentId_subjectId_examType_academicSessionId: {
          studentId: parsed.data.studentId,
          subjectId: parsed.data.subjectId,
          examType: parsed.data.examType,
          academicSessionId: activeSessionId,
        },
      },
      update: { score: parsed.data.score, status: parsed.data.status },
      create: {
        studentId: parsed.data.studentId,
        subjectId: parsed.data.subjectId,
        teacherId,
        examType: parsed.data.examType,
        score: parsed.data.score,
        status: parsed.data.status,
        academicSessionId: activeSessionId,
      },
    })

    const auditPromise = logActivity({
      userId: session.userId,
      action: parsed.data.status === "PUBLISHED" ? "MARK_PUBLISHED" : "MARK_DRAFTED",
      target: "Mark",
      targetId: existingMark?.id ?? `${parsed.data.studentId}_${parsed.data.subjectId}_${parsed.data.examType}`,
      oldData: existingMark,
      newData: { score: parsed.data.score, status: parsed.data.status },
    })

    // Step B: Wrap upsert and audit logging in a single prisma.$transaction
    await prisma.$transaction([markUpsertPromise, auditPromise])

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
  const session = await requireTeacherSession()
  if (!session) return { error: "Unauthorized" }
  if (!markIds || markIds.length === 0) return { success: true }

  try {
    const teacherId = await getTeacherId(session.userId)
    if (!teacherId) return { error: "Teacher profile not found" }

    const marks = await prisma.mark.findMany({
      where: { id: { in: markIds }, teacherId },
      select: { id: true, studentId: true },
    })
    if (marks.length === 0) return { error: "No matching mark records found to update." }

    const settings = await prisma.schoolSettings.findUnique({ where: { id: "default" }, select: { activeSessionId: true } })
    if (settings?.activeSessionId) {
      const finalized = await prisma.studentAcademicRecord.count({
        where: { studentId: { in: [...new Set(marks.map((m) => m.studentId))] }, academicSessionId: settings.activeSessionId, status: "FINALIZED" },
      })
      if (finalized > 0) return { error: "Cannot bulk update marks: one or more students have finalized academic records." }
    }

    const targetIds = marks.map((m) => m.id)
    await prisma.$transaction([
      prisma.mark.updateMany({ where: { id: { in: targetIds }, teacherId }, data: { status } }),
      prisma.activityLog.create({
        data: {
          action: status === "PUBLISHED" ? "BULK_PUBLISHED_MARKS" : "BULK_DRAFTED_MARKS",
          entityType: "Mark",
          entityId: null,
          details: `Bulk updated ${targetIds.length} marks to ${status}`,
          actorId: session.userId,
        },
      }),
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
