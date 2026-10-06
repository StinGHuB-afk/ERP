"use server"

import prisma from "@/lib/prisma"
import { hashPassword } from "@/lib/auth/password-crypto"
import { Role, StudentStatus, EnrollmentStatus } from "@prisma/client"
import { revalidatePath } from "next/cache"
import { requireActiveSessionId } from "@/lib/auth/teacher-authorization"

export interface StudentUploadRecord {
  name: string
  email: string
  rollNumber?: string | null
  classId?: string | null
  password?: string | null
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function bulkUploadStudents(data: StudentUploadRecord[]) {
  if (!data || data.length === 0) {
    return { error: "No student records provided." }
  }

  try {
    // 1. Fetch available classes & active session for name resolution
    const [classes, activeSessionId] = await Promise.all([
      prisma.class.findMany({ select: { id: true, name: true } }),
      requireActiveSessionId().catch(() => null),
    ])

    // Build in-memory lookup dictionary: (UUID -> UUID) and (Normalized Class Name -> UUID)
    const classMap = new Map<string, string>()
    for (const c of classes) {
      classMap.set(c.id, c.id)
      classMap.set(c.id.toLowerCase(), c.id)
      classMap.set(c.name.toLowerCase().trim(), c.id)

      // Support common class name variations (e.g., "10-A" for "Grade 10-A")
      const stripPrefix = c.name.toLowerCase().replace(/^(grade|class)\s+/i, "").trim()
      if (!classMap.has(stripPrefix)) {
        classMap.set(stripPrefix, c.id)
      }
    }

    const resolveClassId = (rawInput?: string | null): { resolvedId: string | null; isInvalid: boolean } => {
      if (!rawInput || rawInput.trim().length === 0) {
        return { resolvedId: null, isInvalid: false }
      }
      const cleaned = rawInput.trim()
      const lower = cleaned.toLowerCase()

      // Direct UUID match
      if (UUID_REGEX.test(cleaned)) {
        const found = classMap.get(cleaned) || classMap.get(lower)
        return found ? { resolvedId: found, isInvalid: false } : { resolvedId: null, isInvalid: true }
      }

      // Exact or normalized name match
      if (classMap.has(lower)) {
        return { resolvedId: classMap.get(lower)!, isInvalid: false }
      }

      // Prefix-stripped match
      const stripPrefix = lower.replace(/^(grade|class)\s+/i, "").trim()
      if (classMap.has(stripPrefix)) {
        return { resolvedId: classMap.get(stripPrefix)!, isInvalid: false }
      }

      // Name provided but not found in database
      return { resolvedId: null, isInvalid: true }
    }

    // 2. Sanitize and filter input rows
    const sanitized = data.filter(
      (r) => r.email && r.name && r.email.trim().length > 0 && r.name.trim().length > 0
    )

    if (sanitized.length === 0) {
      return { error: "CSV contains no valid student rows with email and name." }
    }

    // Filter out rows with non-existent class names
    const validRows: Array<{
      record: StudentUploadRecord
      resolvedClassId: string | null
    }> = []

    for (const r of sanitized) {
      const { resolvedId, isInvalid } = resolveClassId(r.classId)
      if (isInvalid) {
        // Safely skip row if class name was explicitly provided but does not exist in DB
        continue
      }
      validRows.push({ record: r, resolvedClassId: resolvedId })
    }

    if (validRows.length === 0) {
      return { error: "No student records could be matched with valid active classes." }
    }

    const emails = [...new Set(validRows.map((v) => v.record.email.toLowerCase().trim()))]
    
    // Find existing users to avoid duplicate key errors on SQLite
    const existingUsers = await prisma.user.findMany({
      where: { email: { in: emails } },
      select: { email: true },
    })
    const existingEmailSet = new Set(existingUsers.map((u) => u.email))

    // Deduplicate within batch and exclude existing database users
    const seenInBatch = new Set<string>()
    const newRecords = validRows.filter((v) => {
      const email = v.record.email.toLowerCase().trim()
      if (existingEmailSet.has(email) || seenInBatch.has(email)) return false
      seenInBatch.add(email)
      return true
    })

    if (newRecords.length === 0) {
      return {
        success: true,
        count: 0,
        totalProcessed: sanitized.length,
        message: "All students in the CSV already exist in the database.",
      }
    }

    const defaultPasswordHash = await hashPassword("Student@123")

    const newUserData = await Promise.all(
      newRecords.map(async ({ record }) => {
        const pwdHash = record.password && record.password.trim().length > 0
          ? await hashPassword(record.password.trim())
          : defaultPasswordHash

        return {
          email: record.email.toLowerCase().trim(),
          name: record.name.trim(),
          password: pwdHash,
          role: Role.STUDENT,
          mustChangePassword: true,
        }
      })
    )

    await prisma.user.createMany({
      data: newUserData,
    })

    const createdUsers = await prisma.user.findMany({
      where: { email: { in: newRecords.map((v) => v.record.email.toLowerCase().trim()) } },
      select: { id: true, email: true },
    })

    const emailToUserIdMap = new Map(createdUsers.map((u) => [u.email, u.id]))

    const studentData: Array<{
      userId: string
      rollNumber: string | null
      classId: string | null
      status: StudentStatus
    }> = []

    // 3. Create Student records and Enrollments with resolved class UUIDs
    for (const { record, resolvedClassId } of newRecords) {
      const userId = emailToUserIdMap.get(record.email.toLowerCase().trim())
      if (!userId) continue

      studentData.push({
        userId,
        rollNumber: record.rollNumber ? record.rollNumber.trim() : null,
        classId: resolvedClassId,
        status: StudentStatus.ACTIVE,
      })
    }

    const createdStudentRecords = await prisma.$transaction(async (tx) => {
      const res = await tx.student.createMany({
        data: studentData,
      })

      // Create active StudentEnrollment records for current session if available
      if (activeSessionId) {
        const studentRows = await tx.student.findMany({
          where: { userId: { in: Array.from(emailToUserIdMap.values()) } },
          select: { id: true, classId: true },
        })

        const enrollmentData: Array<{
          studentId: string
          classId: string
          academicSessionId: string
          status: EnrollmentStatus
        }> = []

        for (const s of studentRows) {
          if (s.classId) {
            enrollmentData.push({
              studentId: s.id,
              classId: s.classId,
              academicSessionId: activeSessionId,
              status: EnrollmentStatus.ACTIVE,
            })
          }
        }

        if (enrollmentData.length > 0) {
          await tx.studentEnrollment.createMany({
            data: enrollmentData,
          })
        }
      }

      return res
    })

    revalidatePath("/admin/students")
    revalidatePath("/admin/class")

    return {
      success: true,
      count: createdStudentRecords.count,
      totalProcessed: sanitized.length,
    }
  } catch (error) {
    console.error("Error in bulkUploadStudents:", error)
    return { error: "Failed to execute bulk student onboarding." }
  }
}

export interface TeacherUploadRecord {
  name: string
  email: string
  teacherId?: string | null
  specialization?: string | null
  qualification?: string | null
  password?: string | null
}

export async function bulkUploadTeachers(data: TeacherUploadRecord[]) {
  if (!data || data.length === 0) {
    return { error: "No teacher records provided." }
  }

  try {
    const { verifySession, getEffectiveTenantId } = await import("@/lib/auth/session")
    const session = await verifySession()
    if (!session || (session.role !== Role.ADMIN && session.role !== Role.SUPERADMIN)) {
      return { error: "Unauthorized access." }
    }

    const effectiveTenantId = await getEffectiveTenantId()
    const schoolId = session.role === Role.SUPERADMIN ? (effectiveTenantId || null) : (session.schoolId || effectiveTenantId || null)

    if (!schoolId && session.role !== Role.SUPERADMIN) {
      return { error: "No active school context found." }
    }

    // 1. Sanitize & deduplicate input rows
    const sanitized = data.filter((r) => r.email && r.name && r.email.trim().length > 0 && r.name.trim().length > 0)
    if (sanitized.length === 0) {
      return { error: "CSV contains no valid teacher rows with email and name." }
    }

    const emails = [...new Set(sanitized.map((v) => v.email.toLowerCase().trim()))]
    const existingUsers = await prisma.user.findMany({
      where: { email: { in: emails } },
      select: { email: true },
    })
    const existingEmailSet = new Set(existingUsers.map((u) => u.email))

    const seenInBatch = new Set<string>()
    const newRecords = sanitized.filter((r) => {
      const email = r.email.toLowerCase().trim()
      if (existingEmailSet.has(email) || seenInBatch.has(email)) return false
      seenInBatch.add(email)
      return true
    })

    if (newRecords.length === 0) {
      return {
        success: true,
        count: 0,
        totalProcessed: sanitized.length,
        message: "All teachers in the CSV already exist in the database.",
      }
    }

    const defaultPasswordHash = await hashPassword("Teacher@123")

    // Create Users & Teachers
    const newUserData = await Promise.all(
      newRecords.map(async (r) => {
        const pwdHash = r.password && r.password.trim().length > 0 ? await hashPassword(r.password.trim()) : defaultPasswordHash
        return {
          email: r.email.toLowerCase().trim(),
          name: r.name.trim(),
          password: pwdHash,
          role: Role.TEACHER,
          mustChangePassword: true,
          schoolId: schoolId,
        }
      })
    )

    await prisma.user.createMany({
      data: newUserData,
    })

    const createdUsers = await prisma.user.findMany({
      where: { email: { in: newRecords.map((r) => r.email.toLowerCase().trim()) } },
      select: { id: true, email: true },
    })
    const emailToUserIdMap = new Map(createdUsers.map((u) => [u.email, u.id]))

    // Create Teacher profile records
    const teacherData = newRecords.map((r) => {
      const userId = emailToUserIdMap.get(r.email.toLowerCase().trim())!
      return {
        userId,
        specialization: r.specialization ? r.specialization.trim() : null,
        qualification: r.qualification ? r.qualification.trim() : null,
      }
    })

    await prisma.teacher.createMany({
      data: teacherData,
    })

    revalidatePath("/admin/teachers")
    revalidatePath("/admin/classes")

    return {
      success: true,
      count: newRecords.length,
      totalProcessed: sanitized.length,
    }
  } catch (error) {
    console.error("Error in bulkUploadTeachers:", error)
    return { error: "Failed to execute bulk teacher onboarding." }
  }
}
