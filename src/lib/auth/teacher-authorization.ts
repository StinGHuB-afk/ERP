import prisma from "@/lib/prisma"

// --- Active Session Helpers ---

export async function getActiveAcademicSession() {
  const settings = await prisma.schoolSettings.findUnique({
    where: { id: "default" },
    include: { activeSession: true },
  })
  return settings?.activeSession ?? null
}

export async function requireActiveSessionId(): Promise<string> {
  const session = await getActiveAcademicSession()
  if (!session) throw new Error("No active academic session configured.")
  return session.id
}

// --- Class Teacher Role Helpers ---

export async function getClassTeacherAssignments(teacherId: string, academicSessionId: string) {
  return prisma.classTeacherAssignment.findMany({
    where: { teacherId, academicSessionId, isActive: true },
    include: { class: true },
  })
}

export async function getClassTeacherClassIds(teacherId: string, academicSessionId: string): Promise<string[]> {
  const rows = await prisma.classTeacherAssignment.findMany({
    where: { teacherId, academicSessionId, isActive: true },
    select: { classId: true },
  })
  return rows.map((r) => r.classId)
}

export async function getStudentsForClassTeacherRole(teacherId: string, academicSessionId: string) {
  const classIds = await getClassTeacherClassIds(teacherId, academicSessionId)
  if (classIds.length === 0) return []

  return prisma.studentEnrollment.findMany({
    where: { classId: { in: classIds }, academicSessionId, status: "ACTIVE" },
    include: { student: { include: { user: true } }, class: true },
  })
}

export async function assertClassTeacherOwnership(teacherId: string, classId: string, academicSessionId: string): Promise<void> {
  const assignment = await prisma.classTeacherAssignment.findFirst({
    where: { teacherId, classId, academicSessionId, isActive: true },
    select: { id: true },
  })
  if (!assignment) {
    throw new Error("Authorization denied: You are not the active class teacher for this class in the current session.")
  }
}

export async function assertStudentInClassTeacherRoster(
  teacherId: string,
  studentId: string,
  academicSessionId: string
): Promise<{ classId: string; enrollmentId: string }> {
  const classIds = await getClassTeacherClassIds(teacherId, academicSessionId)
  if (classIds.length === 0) throw new Error("Authorization denied: You have no class assignments this session.")

  const enrollment = await prisma.studentEnrollment.findFirst({
    where: { studentId, classId: { in: classIds }, academicSessionId, status: "ACTIVE" },
    select: { id: true, classId: true },
  })
  if (!enrollment) {
    throw new Error("Authorization denied: This student is not enrolled in your class(es) for the current session.")
  }

  return { classId: enrollment.classId, enrollmentId: enrollment.id }
}

// --- Subject Teacher Role Helpers ---

export async function getSubjectTeachingAssignments(teacherId: string, academicSessionId: string) {
  return prisma.teachingAssignment.findMany({
    where: { teacherId, academicSessionId, isActive: true },
    include: { subject: true, class: true },
  })
}

export async function getSubjectTeacherClassIds(teacherId: string, academicSessionId: string): Promise<string[]> {
  const assignments = await prisma.teachingAssignment.findMany({
    where: { teacherId, academicSessionId, isActive: true },
    select: { classId: true },
  })
  return [...new Set(assignments.map((a) => a.classId))]
}

export async function getStudentsForSubjectAssignment(teacherId: string, subjectId: string, academicSessionId: string) {
  const assignments = await prisma.teachingAssignment.findMany({
    where: { teacherId, subjectId, academicSessionId, isActive: true },
    select: { classId: true },
  })
  const classIds = assignments.map((a) => a.classId)
  if (classIds.length === 0) return []

  return prisma.studentEnrollment.findMany({
    where: { classId: { in: classIds }, academicSessionId, status: "ACTIVE" },
    include: { student: { include: { user: true } }, class: true },
  })
}

export async function assertTeachingAssignment(
  teacherId: string,
  subjectId: string,
  classId: string,
  academicSessionId: string
): Promise<void> {
  const assignment = await prisma.teachingAssignment.findFirst({
    where: { teacherId, subjectId, classId, academicSessionId, isActive: true },
    select: { id: true },
  })
  if (!assignment) {
    throw new Error("Authorization denied: You do not have an active teaching assignment for this subject in this class.")
  }
}

export async function assertMarkEntryAuthorized(
  teacherId: string,
  studentId: string,
  subjectId: string,
  academicSessionId: string
): Promise<{ enrollmentId: string; classId: string }> {
  const enrollment = await prisma.studentEnrollment.findFirst({
    where: { studentId, academicSessionId, status: "ACTIVE" },
    select: { id: true, classId: true },
  })
  if (!enrollment) throw new Error("Validation failed: Student has no active enrollment in the current session.")

  const assignment = await prisma.teachingAssignment.findFirst({
    where: { teacherId, subjectId, classId: enrollment.classId, academicSessionId, isActive: true },
    select: { id: true },
  })
  if (!assignment) {
    throw new Error("Authorization denied: You do not have an active teaching assignment for this subject in this student's class.")
  }

  return { enrollmentId: enrollment.id, classId: enrollment.classId }
}

export async function validateAttendanceRoster(
  studentIds: string[],
  classId: string,
  academicSessionId: string
): Promise<{ validStudentIds: string[]; invalidStudentIds: string[] }> {
  if (studentIds.length === 0) return { validStudentIds: [], invalidStudentIds: [] }

  const validEnrollments = await prisma.studentEnrollment.findMany({
    where: { studentId: { in: studentIds }, classId, academicSessionId, status: "ACTIVE" },
    select: { studentId: true },
  })

  const validSet = new Set(validEnrollments.map((e) => e.studentId))
  return {
    validStudentIds: studentIds.filter((id) => validSet.has(id)),
    invalidStudentIds: studentIds.filter((id) => !validSet.has(id)),
  }
}

// --- Learning Hub Helpers ---

export async function getTeacherLearningHubAssignments(teacherId: string, academicSessionId: string) {
  return prisma.teachingAssignment.findMany({
    where: { teacherId, academicSessionId, isActive: true },
    include: { subject: true, class: true },
    orderBy: [{ subject: { name: "asc" } }, { class: { name: "asc" } }],
  })
}

export async function assertTeacherCanManageContent(
  teacherId: string,
  subjectId: string,
  academicSessionId: string,
  classId?: string
): Promise<void> {
  const assignment = await prisma.teachingAssignment.findFirst({
    where: { teacherId, subjectId, academicSessionId, isActive: true, ...(classId ? { classId } : {}) },
    select: { id: true },
  })
  if (!assignment) {
    throw new Error("Authorization denied: You do not have a teaching assignment for this subject (or class) in the current session.")
  }
}
