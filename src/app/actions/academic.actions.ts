"use server"

import prisma from "@/lib/prisma"
import { verifySession } from "@/lib/auth/session"
import { Role, DayOfWeek, SubmissionStatus } from "@prisma/client"
import { revalidatePath } from "next/cache"

export interface CreateTimetablePeriodInput {
  classId: string
  subjectId: string
  teacherId: string
  dayOfWeek: DayOfWeek
  startTime: string
  endTime: string
  schoolId?: string
}

export interface CreateAssignmentInput {
  classId: string
  subjectId: string
  title: string
  description?: string
  dueDate: Date | string
  maxMarks?: number
  teacherId?: string
  schoolId?: string
}

async function resolveTenantContext(overrideSchoolId?: string) {
  const session = await verifySession()
  if (!session) {
    throw new Error("Unauthorized: Authentication required.")
  }

  if (session.role === Role.SUPERADMIN) {
    return { session, schoolId: overrideSchoolId || session.schoolId || null }
  }

  if (!session.schoolId) {
    throw new Error("Orphaned account: No school association found.")
  }

  return { session, schoolId: session.schoolId }
}

// ============================================================
// TIMETABLE & CLASH DETECTION ACTIONS
// ============================================================

export async function createTimetablePeriod(data: CreateTimetablePeriodInput) {
  const { session, schoolId } = await resolveTenantContext(data.schoolId)

  if (session.role !== Role.ADMIN && session.role !== Role.SUPERADMIN) {
    throw new Error("Unauthorized: Administrative privileges required.")
  }

  if (!schoolId) {
    throw new Error("School context required to create a timetable period.")
  }

  if (!data.startTime || !data.endTime) {
    throw new Error("Start time and end time are required.")
  }

  if (data.startTime >= data.endTime) {
    throw new Error("Start time must be strictly earlier than end time.")
  }

  // Algorithmic Clash Detector
  // Query existing periods on the same dayOfWeek in the same schoolId that share EITHER the same teacherId OR the same classId
  const existingPeriods = await prisma.timetablePeriod.findMany({
    where: {
      schoolId,
      dayOfWeek: data.dayOfWeek,
      OR: [
        { teacherId: data.teacherId },
        { classId: data.classId },
      ],
    },
    select: {
      id: true,
      startTime: true,
      endTime: true,
      teacherId: true,
      classId: true,
    },
  })

  // Compare time strings HH:mm (Lexicographical comparison works identically for HH:mm format)
  for (const existing of existingPeriods) {
    if (data.startTime < existing.endTime && data.endTime > existing.startTime) {
      throw new Error("Clash Detected: The teacher or class is already scheduled during this time.")
    }
  }

  const period = await prisma.timetablePeriod.create({
    data: {
      schoolId,
      classId: data.classId,
      subjectId: data.subjectId,
      teacherId: data.teacherId,
      dayOfWeek: data.dayOfWeek,
      startTime: data.startTime,
      endTime: data.endTime,
    },
    include: {
      subject: { select: { id: true, name: true, code: true } },
      class: { select: { id: true, name: true } },
      teacher: {
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      },
    },
  })

  revalidatePath("/admin/academic")
  revalidatePath("/teacher/timetable")
  revalidatePath("/student/timetable")
  return period
}

export async function getTimetable(classId?: string, teacherId?: string, overrideSchoolId?: string) {
  try {
    const { session, schoolId } = await resolveTenantContext(overrideSchoolId)

    return await prisma.timetablePeriod.findMany({
      where: {
        ...(schoolId ? { schoolId } : {}),
        ...(classId ? { classId } : {}),
        ...(teacherId ? { teacherId } : {}),
      },
      include: {
        subject: { select: { id: true, name: true, code: true } },
        class: { select: { id: true, name: true } },
        teacher: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
      orderBy: [
        { dayOfWeek: "asc" },
        { startTime: "asc" },
      ],
    })
  } catch (err) {
    return []
  }
}

// ============================================================
// ASSIGNMENT & GRADING ACTIONS
// ============================================================

export async function createAssignment(data: CreateAssignmentInput) {
  const { session, schoolId } = await resolveTenantContext(data.schoolId)

  if (
    session.role !== Role.TEACHER &&
    session.role !== Role.ADMIN &&
    session.role !== Role.SUPERADMIN
  ) {
    throw new Error("Unauthorized: Teaching or administrative privileges required.")
  }

  if (!schoolId) {
    throw new Error("School context required to create an assignment.")
  }

  if (!data.title || data.title.trim().length === 0) {
    throw new Error("Assignment title is required.")
  }

  let assignedTeacherId = data.teacherId

  if (session.role === Role.TEACHER || !assignedTeacherId) {
    const teacherRecord = await prisma.teacher.findUnique({
      where: { userId: session.userId },
      select: { id: true },
    })
    if (teacherRecord) {
      assignedTeacherId = teacherRecord.id
    }
  }

  if (!assignedTeacherId) {
    const subject = await prisma.subject.findUnique({
      where: { id: data.subjectId },
      select: { teacherId: true },
    })
    if (subject?.teacherId) {
      assignedTeacherId = subject.teacherId
    }
  }

  if (!assignedTeacherId) {
    throw new Error("Teacher assignment required for creating an assignment.")
  }

  const assignment = await prisma.assignment.create({
    data: {
      schoolId,
      classId: data.classId,
      subjectId: data.subjectId,
      teacherId: assignedTeacherId,
      title: data.title.trim(),
      description: data.description?.trim() || null,
      dueDate: new Date(data.dueDate),
      maxMarks: typeof data.maxMarks === "number" ? data.maxMarks : null,
    },
    include: {
      subject: { select: { id: true, name: true, code: true } },
      class: { select: { id: true, name: true } },
      teacher: {
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      },
    },
  })

  revalidatePath("/admin/academic")
  revalidatePath("/teacher/assignments")
  revalidatePath("/student/assignments")
  return assignment
}

export async function getAssignments(classId?: string, overrideSchoolId?: string) {
  try {
    const { session, schoolId } = await resolveTenantContext(overrideSchoolId)

    return await prisma.assignment.findMany({
      where: {
        ...(schoolId ? { schoolId } : {}),
        ...(classId ? { classId } : {}),
      },
      include: {
        subject: { select: { id: true, name: true, code: true } },
        class: { select: { id: true, name: true } },
        teacher: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
        submissions: {
          include: {
            student: {
              include: {
                user: { select: { id: true, name: true, email: true } },
              },
            },
          },
        },
      },
      orderBy: { dueDate: "asc" },
    })
  } catch (err) {
    return []
  }
}

export async function submitAssignment(assignmentId: string, contentUrl?: string) {
  const { session } = await resolveTenantContext()

  if (session.role !== Role.STUDENT) {
    throw new Error("Unauthorized: Only students can submit assignments.")
  }

  const student = await prisma.student.findUnique({
    where: { userId: session.userId },
    select: { id: true },
  })

  if (!student) {
    throw new Error("Unauthorized: Student profile record not found.")
  }

  const submission = await prisma.assignmentSubmission.upsert({
    where: {
      assignmentId_studentId: {
        assignmentId,
        studentId: student.id,
      },
    },
    create: {
      assignmentId,
      studentId: student.id,
      status: SubmissionStatus.SUBMITTED,
      contentUrl: contentUrl?.trim() || null,
      submittedAt: new Date(),
    },
    update: {
      status: SubmissionStatus.SUBMITTED,
      contentUrl: contentUrl?.trim() || null,
      submittedAt: new Date(),
    },
    include: {
      assignment: { select: { id: true, title: true } },
      student: {
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      },
    },
  })

  revalidatePath("/student/assignments")
  revalidatePath("/teacher/assignments")
  return submission
}

export async function gradeSubmission(submissionId: string, marksObtained: number, feedback?: string) {
  const { session } = await resolveTenantContext()

  if (
    session.role !== Role.TEACHER &&
    session.role !== Role.ADMIN &&
    session.role !== Role.SUPERADMIN
  ) {
    throw new Error("Unauthorized: Administrative or teacher privileges required.")
  }

  if (typeof marksObtained !== "number" || marksObtained < 0) {
    throw new Error("Marks obtained must be a non-negative number.")
  }

  const updatedSubmission = await prisma.assignmentSubmission.update({
    where: { id: submissionId },
    data: {
      status: SubmissionStatus.GRADED,
      marksObtained,
      feedback: feedback?.trim() || null,
    },
    include: {
      assignment: { select: { id: true, title: true, maxMarks: true } },
      student: {
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      },
    },
  })

  revalidatePath("/teacher/assignments")
  revalidatePath("/admin/academic")
  revalidatePath("/student/assignments")
  return updatedSubmission
}
