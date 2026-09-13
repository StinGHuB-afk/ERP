"use server"

import { z } from "zod"
import prisma from "@/lib/prisma"
import { verifySession } from "@/lib/auth/session"
import { verifyTeacherAssignmentAccess, logSecurityEvent } from "@/lib/auth/idor-protection"
import { evaluateStudentRisk, StudentAssessmentMetric } from "@/lib/academic/at-risk-engine"
import { sanitizeInput, idSchema } from "@/lib/validations"
import { logActivity } from "./logging"
import { revalidatePath } from "next/cache"

const reviewRiskFlagSchema = z.object({
  flagId: idSchema("flagId"),
  status: z.enum(["ACKNOWLEDGED", "DISMISSED"]),
  reviewNote: z.string().transform(sanitizeInput).pipe(z.string().min(3, "Review note must be at least 3 characters")),
})

/**
 * Context-Aware Aggregation Query & At-Risk Evaluation
 * Enforces active session scoping & IDOR teacher authorization before retrieving or scoring student data.
 */
export async function getAtRiskStudentsForTeacher(classId?: string) {
  const session = await verifySession()
  if (!session || (session.role !== "TEACHER" && session.role !== "ADMIN")) {
    return { error: "Unauthorized access." }
  }

  // 1. Resolve Active Academic Session
  const settings = await prisma.schoolSettings.findUnique({
    where: { id: "default" },
    select: { activeSessionId: true },
  })

  let activeSessionId = settings?.activeSessionId
  if (!activeSessionId) {
    const activeSession = await prisma.academicSession.findFirst({
      where: { status: "ACTIVE" },
      select: { id: true },
    })
    activeSessionId = activeSession?.id
  }

  if (!activeSessionId) {
    return { error: "No active academic session found." }
  }

  // 2. Resolve Target Class ID if not explicitly provided
  let targetClassId = classId

  if (!targetClassId && session.role === "TEACHER") {
    // Find teacher's assigned class
    const teacher = await prisma.teacher.findUnique({
      where: { userId: session.userId },
      select: { id: true },
    })

    if (teacher) {
      const classAssignment = await prisma.classTeacherAssignment.findFirst({
        where: {
          teacherId: teacher.id,
          academicSessionId: activeSessionId,
          isActive: true,
        },
        select: { classId: true },
      })

      if (classAssignment) {
        targetClassId = classAssignment.classId
      } else {
        const teachingAssignment = await prisma.teachingAssignment.findFirst({
          where: {
            teacherId: teacher.id,
            academicSessionId: activeSessionId,
            isActive: true,
          },
          select: { classId: true },
        })
        targetClassId = teachingAssignment?.classId
      }
    }
  }

  if (!targetClassId) {
    // Return all flags for admin if no specific class requested
    if (session.role === "ADMIN") {
      const flags = await prisma.studentRiskFlag.findMany({
        where: { academicSessionId: activeSessionId },
        include: {
          student: {
            include: {
              user: { select: { name: true, email: true } },
            },
          },
          class: { select: { name: true } },
          reviewedBy: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
      })
      return { success: true, flags, targetClassId: null, activeSessionId }
    }
    return { error: "No assigned class found for teacher." }
  }

  // 3. IDOR Authorization Check: Verify teacher access to target class
  if (session.role === "TEACHER") {
    const authCheck = await verifyTeacherAssignmentAccess({
      userId: session.userId,
      classId: targetClassId,
      academicSessionId: activeSessionId,
    })

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

  // 4. Fetch Active Students in Class for the Active Session via StudentEnrollment
  const enrollments = await prisma.studentEnrollment.findMany({
    where: {
      classId: targetClassId,
      academicSessionId: activeSessionId,
      status: "ACTIVE",
    },
    include: {
      student: {
        include: {
          user: { select: { name: true, email: true } },
        },
      },
      class: { select: { name: true } },
    },
  })

  // 5. Evaluate Risk Level for Enrolled Students via Batch Queries & In-Memory Evaluation
  const studentIds = enrollments.map((e) => e.studentId)

  if (studentIds.length > 0) {
    const [allAttendance, allMarks, existingFlags] = await Promise.all([
      prisma.attendance.findMany({
        where: {
          studentId: { in: studentIds },
          academicSessionId: activeSessionId,
        },
        select: { studentId: true, status: true },
      }),
      prisma.mark.findMany({
        where: {
          studentId: { in: studentIds },
          academicSessionId: activeSessionId,
          status: "PUBLISHED",
        },
        include: {
          subject: { select: { name: true } },
        },
      }),
      prisma.studentRiskFlag.findMany({
        where: {
          studentId: { in: studentIds },
          classId: targetClassId,
          academicSessionId: activeSessionId,
        },
      }),
    ])

    const attendanceByStudent = new Map<string, { status: string }[]>()
    for (const att of allAttendance) {
      const list = attendanceByStudent.get(att.studentId) || []
      list.push(att)
      attendanceByStudent.set(att.studentId, list)
    }

    const marksByStudent = new Map<string, typeof allMarks>()
    for (const mark of allMarks) {
      const list = marksByStudent.get(mark.studentId) || []
      list.push(mark)
      marksByStudent.set(mark.studentId, list)
    }

    const existingFlagsByStudent = new Map(existingFlags.map((f) => [f.studentId, f]))

    const txOps: any[] = []

    for (const studentId of studentIds) {
      const attendanceRecords = attendanceByStudent.get(studentId) || []
      const totalHeld = attendanceRecords.length
      const attendedCount = attendanceRecords.filter(
        (a) => a.status === "PRESENT" || a.status === "LATE"
      ).length
      const attPct = totalHeld > 0 ? (attendedCount / totalHeld) * 100 : 100

      const markRecords = marksByStudent.get(studentId) || []
      const markMetrics: StudentAssessmentMetric[] = markRecords.map((m) => ({
        subjectId: m.subjectId,
        subjectName: m.subject.name,
        examType: m.examType,
        score: m.score,
        maxScore: m.maxScore,
        percentage: m.maxScore > 0 ? (m.score / m.maxScore) * 100 : 0,
      }))

      const evalResult = evaluateStudentRisk({
        attendancePercentage: attPct,
        totalClassesHeld: totalHeld,
        attendedClasses: attendedCount,
        marks: markMetrics,
      })

      if (evalResult.riskLevel !== "LOW") {
        const existingFlag = existingFlagsByStudent.get(studentId)
        if (existingFlag) {
          txOps.push(
            prisma.studentRiskFlag.update({
              where: { id: existingFlag.id },
              data: {
                riskLevel: evalResult.riskLevel,
                riskScore: evalResult.riskScore,
                reasons: JSON.stringify(evalResult.reasons),
                ruleVersion: evalResult.ruleVersion,
              },
            })
          )
        } else {
          txOps.push(
            prisma.studentRiskFlag.create({
              data: {
                studentId,
                classId: targetClassId,
                academicSessionId: activeSessionId,
                riskLevel: evalResult.riskLevel,
                riskScore: evalResult.riskScore,
                reasons: JSON.stringify(evalResult.reasons),
                ruleVersion: evalResult.ruleVersion,
                status: "PENDING",
              },
            })
          )
        }
      }
    }

    if (txOps.length > 0) {
      await prisma.$transaction(txOps)
    }
  }

  // 6. Retrieve All Risk Flags for Target Class
  const flags = await prisma.studentRiskFlag.findMany({
    where: {
      classId: targetClassId,
      academicSessionId: activeSessionId,
    },
    include: {
      student: {
        include: {
          user: { select: { name: true, email: true } },
        },
      },
      class: { select: { name: true } },
      reviewedBy: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return {
    success: true,
    flags,
    targetClassId,
    activeSessionId,
  }
}

/**
 * Staff Review Workflow Action
 * Allows authorized teachers/admins to review, acknowledge, or dismiss false positive risk flags.
 * Logs rule version and reviewing staff member for complete audit compliance.
 */
export async function reviewRiskFlag(rawInput: {
  flagId: string
  status: "ACKNOWLEDGED" | "DISMISSED"
  reviewNote: string
}) {
  const session = await verifySession()
  if (!session || (session.role !== "TEACHER" && session.role !== "ADMIN")) {
    return { error: "Unauthorized access." }
  }

  // Validate Input
  const parseResult = reviewRiskFlagSchema.safeParse(rawInput)
  if (!parseResult.success) {
    return { error: parseResult.error.issues[0]?.message || "Invalid input." }
  }

  const { flagId, status, reviewNote } = parseResult.data

  const existingFlag = await prisma.studentRiskFlag.findUnique({
    where: { id: flagId },
    include: {
      class: { select: { name: true } },
      student: { include: { user: { select: { name: true } } } },
    },
  })

  if (!existingFlag) {
    return { error: "Risk flag record not found." }
  }

  // IDOR Verification for Teachers
  if (session.role === "TEACHER") {
    const authCheck = await verifyTeacherAssignmentAccess({
      userId: session.userId,
      classId: existingFlag.classId,
      academicSessionId: existingFlag.academicSessionId,
    })

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

  // Update Flag with Review Attribution
  const updatedFlag = await prisma.studentRiskFlag.update({
    where: { id: flagId },
    data: {
      status,
      reviewNote,
      reviewedById: session.userId,
      reviewedAt: new Date(),
    },
  })

  // Audit Activity Logging
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
