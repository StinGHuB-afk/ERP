import prisma from "@/lib/prisma"

interface IdorVerificationParams {
  userId: string
  classId: string
  subjectId?: string
  academicSessionId: string
}

interface SecurityLogParams {
  event: "IDOR_ATTEMPT" | "VALIDATION_FAILURE" | "UNAUTHORIZED_ACCESS"
  userId?: string
  clientIp?: string
  resource?: string
  details?: string
}

/**
 * Secure Server-Side Security Logger
 * Records validation and authorization anomalies internally without leaking sensitive details to clients.
 */
export function logSecurityEvent({
  event,
  userId = "ANONYMOUS",
  clientIp = "UNKNOWN",
  resource = "UNKNOWN",
  details = "",
}: SecurityLogParams): void {
  const timestamp = new Date().toISOString()
  console.error(
    JSON.stringify({
      level: "WARN",
      timestamp,
      event,
      userId,
      clientIp,
      resource,
      details,
    })
  )
}

/**
 * Live Database IDOR Verification Utility
 * Verifies that the authenticated userId owns an active ClassTeacherAssignment OR TeachingAssignment
 * for the target classId and academicSessionId before allowing record retrieval.
 */
export async function verifyTeacherAssignmentAccess({
  userId,
  classId,
  subjectId,
  academicSessionId,
}: IdorVerificationParams): Promise<{ isAuthorized: boolean; teacherId?: string }> {
  // 1. Resolve Teacher Profile from User
  const teacher = await prisma.teacher.findUnique({
    where: { userId },
    select: { id: true },
  })

  if (!teacher) {
    return { isAuthorized: false }
  }

  // 2. Check Active Class Teacher Assignment (Homeroom access)
  const classAssignment = await prisma.classTeacherAssignment.findFirst({
    where: {
      teacherId: teacher.id,
      classId,
      academicSessionId,
      isActive: true,
    },
  })

  if (classAssignment) {
    return { isAuthorized: true, teacherId: teacher.id }
  }

  // 3. Check Active Subject Teaching Assignment (Subject access)
  const teachingAssignment = await prisma.teachingAssignment.findFirst({
    where: {
      teacherId: teacher.id,
      classId,
      academicSessionId,
      ...(subjectId ? { subjectId } : {}),
      isActive: true,
    },
  })

  if (teachingAssignment) {
    return { isAuthorized: true, teacherId: teacher.id }
  }

  return { isAuthorized: false, teacherId: teacher.id }
}

interface ParentIdorVerificationParams {
  userId: string
  studentId: string
}

/**
 * Live Database Parent-Child Authority Verification Utility
 * Verifies that the authenticated parent userId has an explicit ParentStudent relation
 * mapped to the target studentId before returning any academic data.
 */
export async function verifyParentStudentAccess({
  userId,
  studentId,
}: ParentIdorVerificationParams): Promise<{ isAuthorized: boolean; parentId?: string }> {
  const parent = await prisma.parent.findUnique({
    where: { userId },
    select: { id: true },
  })

  if (!parent) {
    return { isAuthorized: false }
  }

  const mapping = await prisma.parentStudent.findUnique({
    where: {
      parentId_studentId: {
        parentId: parent.id,
        studentId,
      },
    },
  })

  if (!mapping) {
    return { isAuthorized: false, parentId: parent.id }
  }

  return { isAuthorized: true, parentId: parent.id }
}
