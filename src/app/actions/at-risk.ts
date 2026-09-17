"use server"

import { z } from "zod"
import prisma from "@/lib/prisma"
import { verifySession } from "@/lib/auth/session"
import { verifyTeacherAssignmentAccess, logSecurityEvent } from "@/lib/auth/idor-protection"
import { evaluateStudentRisk } from "@/lib/academic/at-risk-engine"
import { sanitizeInput, idSchema } from "@/lib/validations"
import { logActivity } from "./logging"
import { revalidatePath } from "next/cache"

const reviewRiskFlagSchema = z.object({
  flagId: idSchema("flagId"),
  status: z.enum(["ACKNOWLEDGED", "DISMISSED"]),
  reviewNote: z.string().transform(sanitizeInput).pipe(z.string().min(3, "Review note must be at least 3 characters")),
})

const includeFlagDetails = {
  student: { include: { user: { select: { name: true, email: true } } } },
  class: { select: { name: true } },
  reviewedBy: { select: { name: true } },
}

async function resolveActiveSessionId(): Promise<string | null> {
  const settings = await prisma.schoolSettings.findUnique({
    where: { id: "default" },
    select: { activeSessionId: true },
  })
  if (settings?.activeSessionId) return settings.activeSessionId

  const activeSession = await prisma.academicSession.findFirst({
    where: { status: "ACTIVE" },
    select: { id: true },
  })
  return activeSession?.id ?? null
}

async function resolveTeacherClassId(userId: string, sessionId: string): Promise<string | null> {
  const teacher = await prisma.teacher.findUnique({ where: { userId }, select: { id: true } })
  if (!teacher) return null

  const classAssign = await prisma.classTeacherAssignment.findFirst({
    where: { teacherId: teacher.id, academicSessionId: sessionId, isActive: true },
    select: { classId: true },
  })
  if (classAssign) return classAssign.classId

  const teachAssign = await prisma.teachingAssignment.findFirst({
    where: { teacherId: teacher.id, academicSessionId: sessionId, isActive: true },
    select: { classId: true },
  })
  return teachAssign?.classId ?? null
}

export async function getAtRiskStudentsForTeacher(classId?: string) {
  const session = await verifySession()
  if (!session || (session.role !== "TEACHER" && session.role !== "ADMIN")) {
    return { error: "Unauthorized access." }
  }

  const activeSessionId = await resolveActiveSessionId()
  if (!activeSessionId) return { error: "No active academic session found." }

  let targetClassId = classId || (session.role === "TEACHER" ? await resolveTeacherClassId(session.userId, activeSessionId) : null)

  if (!targetClassId) {
    if (session.role === "ADMIN") {
      const flags = await prisma.studentRiskFlag.findMany({
        where: { academicSessionId: activeSessionId },
        include: includeFlagDetails,
        orderBy: { createdAt: "desc" },
      })
      return { success: true, flags, targetClassId: null, activeSessionId }
    }
    return { error: "No assigned class found for teacher." }
  }

  if (session.role === "TEACHER") {
    const authCheck = await verifyTeacherAssignmentAccess({ userId: session.userId, classId: targetClassId, academicSessionId: activeSessionId })
    if (!authCheck.isAuthorized) {
      logSecurityEvent({
        event: "IDOR_ATTEMPT",
        userId: session.userId,
        resource: `/actions/at-risk/getAtRiskStudentsForTeacher?classId=${targetClassId}`,
        details: `Teacher attempted to query at-risk data for unauthorized classId=${targetClassId}`,
      })
      return { error: "Access denied. You are not assigned to oversee this class." }
    }
  }

  const enrollments = await prisma.studentEnrollment.findMany({
    where: { classId: targetClassId, academicSessionId: activeSessionId, status: "ACTIVE" },
    select: { studentId: true },
  })
  const studentIds = enrollments.map((e) => e.studentId)

  if (studentIds.length > 0) {
    const [allAttendance, allMarks, existingFlags] = await Promise.all([
      prisma.attendance.findMany({ where: { studentId: { in: studentIds }, academicSessionId: activeSessionId }, select: { studentId: true, status: true } }),
      prisma.mark.findMany({ where: { studentId: { in: studentIds }, academicSessionId: activeSessionId, status: "PUBLISHED" }, include: { subject: { select: { name: true } } } }),
      prisma.studentRiskFlag.findMany({ where: { studentId: { in: studentIds }, classId: targetClassId, academicSessionId: activeSessionId } }),
    ])

    const existingFlagsMap = new Map(existingFlags.map((f) => [f.studentId, f]))

    const txOps = studentIds.flatMap((studentId) => {
      const attRecords = allAttendance.filter((a) => a.studentId === studentId)
      const totalHeld = attRecords.length
      const attendedCount = attRecords.filter((a) => a.status === "PRESENT" || a.status === "LATE").length
      const attPct = totalHeld > 0 ? (attendedCount / totalHeld) * 100 : 100

      const studentMarks = allMarks.filter((m) => m.studentId === studentId).map((m) => {
        const score = m.score ?? 0
        return {
          subjectId: m.subjectId,
          subjectName: m.subject.name,
          examType: m.examType,
          score,
          maxScore: m.maxScore,
          percentage: m.maxScore > 0 ? (score / m.maxScore) * 100 : 0,
        }
      })

      const evalResult = evaluateStudentRisk({ attendancePercentage: attPct, totalClassesHeld: totalHeld, attendedClasses: attendedCount, marks: studentMarks })

      if (evalResult.riskLevel === "LOW") return []

      const existing = existingFlagsMap.get(studentId)
      const data = {
        riskLevel: evalResult.riskLevel,
        riskScore: evalResult.riskScore,
        reasons: JSON.stringify(evalResult.reasons),
        ruleVersion: evalResult.ruleVersion,
      }

      return existing
        ? [prisma.studentRiskFlag.update({ where: { id: existing.id }, data })]
        : [prisma.studentRiskFlag.create({ data: { ...data, studentId, classId: targetClassId!, academicSessionId: activeSessionId, status: "PENDING" } })]
    })

    if (txOps.length > 0) await prisma.$transaction(txOps)
  }

  const flags = await prisma.studentRiskFlag.findMany({
    where: { classId: targetClassId, academicSessionId: activeSessionId },
    include: includeFlagDetails,
    orderBy: { createdAt: "desc" },
  })

  return { success: true, flags, targetClassId, activeSessionId }
}

export async function reviewRiskFlag(rawInput: { flagId: string; status: "ACKNOWLEDGED" | "DISMISSED"; reviewNote: string }) {
  const session = await verifySession()
  if (!session || (session.role !== "TEACHER" && session.role !== "ADMIN")) {
    return { error: "Unauthorized access." }
  }

  const parseResult = reviewRiskFlagSchema.safeParse(rawInput)
  if (!parseResult.success) {
    return { error: parseResult.error.issues[0]?.message || "Invalid input." }
  }

  const { flagId, status, reviewNote } = parseResult.data

  const existingFlag = await prisma.studentRiskFlag.findUnique({
    where: { id: flagId },
    include: { student: { include: { user: { select: { name: true } } } } },
  })
  if (!existingFlag) return { error: "Risk flag record not found." }

  if (session.role === "TEACHER") {
    const authCheck = await verifyTeacherAssignmentAccess({ userId: session.userId, classId: existingFlag.classId, academicSessionId: existingFlag.academicSessionId })
    if (!authCheck.isAuthorized) {
      logSecurityEvent({
        event: "UNAUTHORIZED_ACCESS",
        userId: session.userId,
        resource: `/actions/at-risk/reviewRiskFlag/${flagId}`,
        details: `Teacher attempted to review flag for unauthorized classId=${existingFlag.classId}`,
      })
      return { error: "Access denied. You are not authorized to review flags for this class." }
    }
  }

  const updatedFlag = await prisma.studentRiskFlag.update({
    where: { id: flagId },
    data: { status, reviewNote, reviewedById: session.userId, reviewedAt: new Date() },
  })

  await logActivity(
    "RISK_FLAG_REVIEWED",
    "StudentRiskFlag",
    flagId,
    `Reviewed risk flag for student ${existingFlag.student.user?.name || existingFlag.studentId} as ${status}. RuleVersion: ${existingFlag.ruleVersion}. Note: ${reviewNote}`,
    session.userId
  )

  revalidatePath("/teacher/at-risk")
  return { success: true, flag: updatedFlag }
}
