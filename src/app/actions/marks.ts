"use server"

import prisma from "@/lib/prisma"
import { verifySession } from "@/lib/auth/session"
import { verifyTeacherAccess, logActivity } from "@/lib/audit"
import { MarkStatus } from "@prisma/client"
import { revalidatePath } from "next/cache"

export interface SaveMarkInput {
  studentId: string
  classId: string
  subjectId: string
  examType: string
  sessionId: string // Required session ID for Session Drift guard
  score?: number | null
  status?: MarkStatus
  academicSessionId?: string
}

export async function saveMark(input: SaveMarkInput) {
  const session = await verifySession()
  if (!session || !session.isAuth || session.role !== "TEACHER") {
    return { error: "Unauthorized: Insufficient permissions.", status: 401 }
  }

  // Session Drift Guard: Require explicit sessionId in payload
  const activeSessionId = input.sessionId || input.academicSessionId

  if (!activeSessionId || activeSessionId.trim() === "") {
    return { error: "400 Bad Request: Missing required sessionId in payload.", status: 400 }
  }

  // Step A: Await the verifyTeacherAccess guard clause
  await verifyTeacherAccess(session.userId, input.classId, input.subjectId)

  const teacher = await prisma.teacher.findUnique({
    where: { userId: session.userId },
    select: { id: true },
  })

  if (!teacher) {
    return { error: "Unauthorized: Teacher profile not found.", status: 403 }
  }

  // Prisma must use this explicit sessionId for all operations, completely ignoring server date
  const existingMark = await prisma.mark.findUnique({
    where: {
      studentId_subjectId_examType_academicSessionId: {
        studentId: input.studentId,
        subjectId: input.subjectId,
        examType: input.examType,
        academicSessionId: activeSessionId,
      },
    },
  })

  const markUpsertPromise = prisma.mark.upsert({
    where: {
      studentId_subjectId_examType_academicSessionId: {
        studentId: input.studentId,
        subjectId: input.subjectId,
        examType: input.examType,
        academicSessionId: activeSessionId,
      },
    },
    update: {
      score: input.score ?? null,
      status: input.status ?? MarkStatus.GRADED,
    },
    create: {
      studentId: input.studentId,
      subjectId: input.subjectId,
      teacherId: teacher.id,
      examType: input.examType,
      score: input.score ?? null,
      status: input.status ?? MarkStatus.GRADED,
      academicSessionId: activeSessionId,
    },
  })

  const newMarkData = {
    score: input.score,
    status: input.status ?? MarkStatus.GRADED,
    examType: input.examType,
  }

  const logPromise = logActivity({
    userId: session.userId,
    action: existingMark ? "MARK_UPDATED" : "MARK_CREATED",
    target: "Mark",
    targetId: existingMark?.id ?? `${input.studentId}_${input.subjectId}_${input.examType}`,
    oldData: existingMark,
    newData: newMarkData,
  })

  // Step B: Wrap mark.upsert and logActivity in a single prisma.$transaction
  const [savedMark] = await prisma.$transaction([markUpsertPromise, logPromise])

  revalidatePath("/teacher/marks")
  revalidatePath("/teacher/class", "layout")

  return { success: true, mark: savedMark }
}
