"use server"

import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { verifySession } from "@/lib/auth/session"
import { logActivity } from "./logging"
import { assertClassTeacherOwnership, validateAttendanceRoster, requireActiveSessionId } from "@/lib/auth/teacher-authorization"

export interface UpsertAttendanceInput {
  studentId: string
  classId: string
  date: string
  status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED"
  sessionId: string // Required sessionId for Session Drift guard
  remarks?: string
  expectedSessionId?: string
}

export async function upsertAttendance(data: UpsertAttendanceInput) {
  const session = await verifySession()
  if (!session || (session.role !== "TEACHER" && session.role !== "ADMIN")) {
    return { error: "Unauthorized", status: 401 }
  }

  // Session Drift Guard: Require explicit sessionId in payload
  const activeSessionId = data.sessionId || data.expectedSessionId

  if (!activeSessionId || activeSessionId.trim() === "") {
    return { error: "400 Bad Request: Missing required sessionId in payload.", status: 400 }
  }

  let teacherId = null
  if (session.role === "TEACHER") {
    const teacher = await prisma.teacher.findUnique({ where: { userId: session.userId } })
    if (!teacher) return { error: "Teacher profile not found", status: 403 }
    teacherId = teacher.id

    try {
      await assertClassTeacherOwnership(teacherId, data.classId, activeSessionId)
    } catch (e: any) {
      return { error: e.message }
    }
  } else {
    // Admin override: find the class teacher for the specified explicit session to record attendance against
    const assignment = await prisma.classTeacherAssignment.findFirst({ 
      where: { classId: data.classId, academicSessionId: activeSessionId, isActive: true } 
    })
    if (!assignment) return { error: "Class has no active class teacher for the specified session to record attendance against." }
    teacherId = assignment.teacherId
  }

  try {
    const record = await prisma.studentAcademicRecord.findUnique({
      where: { studentId_academicSessionId: { studentId: data.studentId, academicSessionId: activeSessionId } }
    })
    if (record?.status === "FINALIZED") {
      return { error: "Academic record is finalized and immutable." }
    }

    const attendanceDate = new Date(data.date)
    attendanceDate.setHours(0, 0, 0, 0) // Normalize to midnight

    // Explicitly use activeSessionId from payload for Prisma operations, ignoring server calendar date
    const attendance = await prisma.attendance.upsert({
      where: {
        studentId_date: {
          studentId: data.studentId,
          date: attendanceDate
        }
      },
      update: {
        status: data.status,
        remarks: data.remarks,
        academicSessionId: activeSessionId
      },
      create: {
        studentId: data.studentId,
        classId: data.classId,
        teacherId: teacherId,
        date: attendanceDate,
        status: data.status,
        remarks: data.remarks,
        academicSessionId: activeSessionId
      }
    })

    await logActivity("ATTENDANCE_MARKED", "Attendance", attendance.id, `Status set to ${data.status} for ${attendanceDate.toISOString().split('T')[0]}`, session.userId)

    revalidatePath("/teacher/attendance")
    revalidatePath("/admin/attendance")
    revalidatePath("/teacher/class", "layout")
    revalidatePath("/student", "layout")
    return { success: true, attendance }
  } catch (err) {
    console.error(err)
    return { error: "Failed to save attendance" }
  }
}

export async function bulkMarkPresent(classId: string, date: string, studentIds: string[], expectedSessionId?: string) {
  const session = await verifySession()
  if (!session || session.role !== "TEACHER") {
    return { error: "Unauthorized" }
  }

  const teacher = await prisma.teacher.findUnique({ where: { userId: session.userId } })
  if (!teacher) return { error: "Teacher profile not found" }

  const activeSessionId = await requireActiveSessionId()
  if (expectedSessionId && expectedSessionId !== activeSessionId) {
    return { error: "The active academic session has changed. Please reload the page." }
  }

  try {
    await assertClassTeacherOwnership(teacher.id, classId, activeSessionId)
  } catch (e: any) {
    return { error: e.message }
  }

  try {
    const attendanceDate = new Date(date)
    attendanceDate.setHours(0, 0, 0, 0)

    // Ensure all target students belong to the class
    const { validStudentIds } = await validateAttendanceRoster(studentIds, classId, activeSessionId)
    
    if (validStudentIds.length === 0) return { error: "No valid students found" }

    if (activeSessionId) {
      const finalizedRecords = await prisma.studentAcademicRecord.count({
        where: {
          studentId: { in: validStudentIds },
          academicSessionId: activeSessionId,
          status: "FINALIZED"
        }
      })
      if (finalizedRecords > 0) {
        return { error: "Cannot bulk update attendance: one or more students have finalized academic records." }
      }
    }

    // Execute in transaction
    await prisma.$transaction(
      validStudentIds.map((sid) => 
        prisma.attendance.upsert({
          where: {
            studentId_date: {
              studentId: sid,
              date: attendanceDate
            }
          },
          update: {
            status: "PRESENT"
          },
          create: {
            studentId: sid,
            classId: classId,
            teacherId: teacher.id,
            date: attendanceDate,
            status: "PRESENT",
            academicSessionId: activeSessionId
          }
        })
      )
    )

    await logActivity("BULK_ATTENDANCE", "Attendance", classId, `Bulk marked present for ${validStudentIds.length} students on ${attendanceDate.toISOString().split('T')[0]}`, session.userId)

    revalidatePath("/", "layout")
    return { success: true }
  } catch (err) {
    console.error(err)
    return { error: "Failed to mark bulk attendance" }
  }
}

export interface GetAttendanceFilters {
  from?: string
  to?: string
  classId?: string
  studentId?: string
}

export async function getAttendanceRecords(filters: GetAttendanceFilters = {}) {
  const session = await verifySession()
  if (!session) {
    return { error: "Unauthorized: Insufficient permissions." }
  }

  try {
    let dateQuery: { gte?: Date; lte?: Date } = {}

    if (filters.from && filters.to) {
      const fromDate = new Date(filters.from)
      fromDate.setHours(0, 0, 0, 0)

      const toDate = new Date(filters.to)
      toDate.setHours(23, 59, 59, 999)

      dateQuery = {
        gte: fromDate,
        lte: toDate,
      }
    } else if (filters.from) {
      const fromDate = new Date(filters.from)
      fromDate.setHours(0, 0, 0, 0)
      dateQuery = { gte: fromDate }
    } else if (filters.to) {
      const toDate = new Date(filters.to)
      toDate.setHours(23, 59, 59, 999)
      dateQuery = { lte: toDate }
    } else {
      // Default to fetching current day's attendance
      const startOfToday = new Date()
      startOfToday.setHours(0, 0, 0, 0)

      const endOfToday = new Date()
      endOfToday.setHours(23, 59, 59, 999)

      dateQuery = {
        gte: startOfToday,
        lte: endOfToday,
      }
    }

    const records = await prisma.attendance.findMany({
      where: {
        date: dateQuery,
        ...(filters.classId ? { classId: filters.classId } : {}),
        ...(filters.studentId ? { studentId: filters.studentId } : {}),
      },
      include: {
        student: {
          include: {
            user: {
              select: { name: true, email: true },
            },
          },
        },
        class: {
          select: { id: true, name: true },
        },
        teacher: {
          include: {
            user: {
              select: { name: true, email: true },
            },
          },
        },
        subject: {
          select: { id: true, name: true, code: true },
        },
      },
      orderBy: { date: "desc" },
    })

    return { success: true, records }
  } catch (error) {
    console.error("Error in getAttendanceRecords:", error)
    return { error: "Failed to fetch attendance records." }
  }
}
