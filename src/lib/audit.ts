import prisma from "@/lib/prisma"

export interface LogActivityParams {
  userId: string
  action: string
  target: string
  targetId: string
  oldData?: unknown
  newData?: unknown
}

export function logActivity({
  userId,
  action,
  target,
  targetId,
  oldData,
  newData,
}: LogActivityParams) {
  const formattedOld = oldData != null ? (typeof oldData === "string" ? oldData : JSON.stringify(oldData)) : null
  const formattedNew = newData != null ? (typeof newData === "string" ? newData : JSON.stringify(newData)) : null

  return prisma.activityLog.create({
    data: {
      userId,
      actionType: action,
      targetEntity: target,
      targetId,
      oldData: formattedOld,
      newData: formattedNew,
      action,
      entityType: target,
      entityId: targetId,
      actorId: userId,
    },
  })
}

export async function verifyTeacherAccess(
  userId: string,
  classId: string,
  subjectId: string
): Promise<boolean> {
  const teacher = await prisma.teacher.findUnique({
    where: { userId },
    select: { id: true },
  })

  if (!teacher) {
    throw new Error("Unauthorized: Teacher profile not found.")
  }

  const now = new Date()

  const assignment = await prisma.teachingAssignment.findFirst({
    where: {
      teacherId: teacher.id,
      classId,
      subjectId,
      isActive: true,
      startDate: { lte: now },
      OR: [
        { endDate: null },
        { endDate: { gte: now } },
      ],
    },
    select: { id: true },
  })

  if (!assignment) {
    throw new Error("Unauthorized: No active teaching assignment for this class and subject.")
  }

  return true
}
