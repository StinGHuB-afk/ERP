"use server"

import prisma from "@/lib/prisma"
import { verifySession } from "@/lib/auth/session"
import { verifyParentStudentAccess, logSecurityEvent } from "@/lib/auth/idor-protection"

/**
 * Fetch List of Verified Children for Authenticated Parent
 * Strictly scopes query to ParentStudent mapping table linked to parent's userId.
 */
export async function getParentChildren() {
  const session = await verifySession()
  if (!session || session.role !== "PARENT") {
    return { error: "Unauthorized access. Parent credentials required." }
  }

  const parent = await prisma.parent.findUnique({
    where: { userId: session.userId },
    include: {
      children: {
        include: {
          student: {
            include: {
              user: { select: { name: true, email: true } },
              class: { select: { name: true } },
            },
          },
        },
      },
    },
  })

  if (!parent) {
    return { error: "Parent profile not found." }
  }

  const children = parent.children.map((mapping) => ({
    studentId: mapping.studentId,
    name: mapping.student.user?.name || "Child",
    email: mapping.student.user?.email || "",
    rollNumber: mapping.student.rollNumber || "N/A",
    className: mapping.student.class?.name || "Unassigned",
    relationship: mapping.relationship,
    isPrimaryContact: mapping.isPrimaryContact,
  }))

  return { success: true, children }
}

/**
 * Parent Authorization Wrapper & Reusable Service: Fetch Child Attendance
 * Verifies live database parent-child authority before executing attendance aggregation.
 */
export async function getChildAttendance(studentId: string) {
  const session = await verifySession()
  if (!session || session.role !== "PARENT") {
    return { error: "Unauthorized access." }
  }

  // Live Database Anti-Enumeration & IDOR Verification
  const authCheck = await verifyParentStudentAccess({
    userId: session.userId,
    studentId,
  })

  if (!authCheck.isAuthorized) {
    logSecurityEvent({
      event: "IDOR_ATTEMPT",
      userId: session.userId,
      resource: `/actions/parent/getChildAttendance/${studentId}`,
      details: `Parent userId=${session.userId} attempted unauthorized attendance access for studentId=${studentId}`,
    })
    return { error: "Access denied. Student record not found or unlinked." }
  }

  // Resolve Active Session
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

  // Reuse Attendance Aggregation Query Service
  const attendanceRecords = await prisma.attendance.findMany({
    where: {
      studentId,
      ...(activeSessionId ? { academicSessionId: activeSessionId } : {}),
    },
    select: {
      id: true,
      date: true,
      status: true,
      remarks: true,
    },
    orderBy: { date: "desc" },
  })

  const totalDays = attendanceRecords.length
  const presentDays = attendanceRecords.filter((a) => a.status === "PRESENT").length
  const lateDays = attendanceRecords.filter((a) => a.status === "LATE").length
  const absentDays = attendanceRecords.filter((a) => a.status === "ABSENT").length
  const excusedDays = attendanceRecords.filter((a) => a.status === "EXCUSED").length

  const attendancePercentage = totalDays > 0 ? Math.round(((presentDays + lateDays) / totalDays) * 100) : 100

  return {
    success: true,
    studentId,
    summary: {
      totalDays,
      presentDays,
      lateDays,
      absentDays,
      excusedDays,
      attendancePercentage,
    },
    records: attendanceRecords,
  }
}

/**
 * Parent Authorization Wrapper & Reusable Service: Fetch Child Academic Results
 * Reuses published mark & report card services while filtering out internal draft marks.
 */
export async function getChildResults(studentId: string) {
  const session = await verifySession()
  if (!session || session.role !== "PARENT") {
    return { error: "Unauthorized access." }
  }

  // Live Database Anti-Enumeration & IDOR Verification
  const authCheck = await verifyParentStudentAccess({
    userId: session.userId,
    studentId,
  })

  if (!authCheck.isAuthorized) {
    logSecurityEvent({
      event: "IDOR_ATTEMPT",
      userId: session.userId,
      resource: `/actions/parent/getChildResults/${studentId}`,
      details: `Parent userId=${session.userId} attempted unauthorized academic result access for studentId=${studentId}`,
    })
    return { error: "Access denied. Student record not found or unlinked." }
  }

  // Resolve Active Session
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

  // Fetch Published Term Marks (Strictly excluding DRAFT marks)
  const publishedMarks = await prisma.mark.findMany({
    where: {
      studentId,
      status: "PUBLISHED",
      ...(activeSessionId ? { academicSessionId: activeSessionId } : {}),
    },
    include: {
      subject: { select: { name: true, code: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  // Fetch Published/Finalized Academic Record
  const academicRecord = await prisma.studentAcademicRecord.findFirst({
    where: {
      studentId,
      ...(activeSessionId ? { academicSessionId: activeSessionId } : {}),
      status: { in: ["PUBLISHED", "FINALIZED"] },
    },
    select: {
      id: true,
      finalPercentage: true,
      finalGrade: true,
      status: true,
      verificationCode: true,
      isRevoked: true,
    },
  })

  return {
    success: true,
    studentId,
    academicRecord,
    marks: publishedMarks.map((m) => ({
      id: m.id,
      subjectName: m.subject.name,
      subjectCode: m.subject.code,
      examType: m.examType,
      score: m.score,
      maxScore: m.maxScore,
      percentage: m.maxScore > 0 ? Math.round((m.score / m.maxScore) * 100) : 0,
    })),
  }
}
