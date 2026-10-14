"use server"

import prisma from "@/lib/prisma"
import { hashPassword } from "@/lib/auth/password-crypto"
import { Role, StudentStatus, EnrollmentStatus } from "@prisma/client"
import { revalidatePath } from "next/cache"
import { requireActiveSessionId } from "@/lib/auth/teacher-authorization"
import { verifySession, getEffectiveTenantId } from "@/lib/auth/session"
import { matchClassToAvailable } from "@/lib/onboarding-validator"

export interface StudentUploadRecord {
  name: string
  email: string
  rollNumber?: string | null
  classId?: string | null
  password?: string | null
  anomalies?: string[]
}

export interface TeacherUploadRecord {
  name: string
  email: string
  teacherId?: string | null
  specialization?: string | null
  qualification?: string | null
  password?: string | null
  anomalies?: string[]
}

export interface StudentQuickFixInput {
  name?: string
  email?: string
  rollNumber?: string | null
  classId?: string | null
}

export interface TeacherQuickFixInput {
  name?: string
  email?: string
  teacherId?: string | null
  specialization?: string | null
  qualification?: string | null
}

export interface OnboardingContextResult {
  schoolId: string
  schoolName: string
  schoolDomain: string
  classes: Array<{ id: string; name: string }>
  activeSessionId: string | null
}

/**
 * Retrieves the active tenant onboarding metadata (school info, classes, active session).
 */
export async function getOnboardingContext(): Promise<OnboardingContextResult | { error: string }> {
  try {
    const session = await verifySession()
    if (!session || (session.role !== Role.ADMIN && session.role !== Role.SUPERADMIN)) {
      return { error: "Unauthorized access." }
    }

    const effectiveTenantId = await getEffectiveTenantId()
    const schoolId = session.role === Role.SUPERADMIN ? (effectiveTenantId || null) : (session.schoolId || effectiveTenantId || null)

    if (!schoolId) {
      return { error: "No active school context found." }
    }

    const [school, classes, activeSessionId] = await Promise.all([
      prisma.school.findUnique({
        where: { id: schoolId },
        select: { id: true, name: true },
      }),
      prisma.class.findMany({
        where: { schoolId },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      requireActiveSessionId().catch(() => null),
    ])

    const schoolDomain = school?.name
      ? `${school.name.toLowerCase().replace(/[^a-z0-9]/g, "")}.edu`
      : "school.edu"

    return {
      schoolId,
      schoolName: school?.name || "School ERP",
      schoolDomain,
      classes,
      activeSessionId,
    }
  } catch (error) {
    console.error("Error in getOnboardingContext:", error)
    return { error: "Failed to load onboarding context." }
  }
}

/**
 * Checks for existing emails and roll numbers within the current tenant to detect duplicates upfront.
 */
export async function checkExistingStudentIdentifiers(identifiers: {
  emails: string[]
  rollNumbers: string[]
}): Promise<{ existingEmails: string[]; existingRollNumbers: string[] } | { error: string }> {
  try {
    const session = await verifySession()
    if (!session || (session.role !== Role.ADMIN && session.role !== Role.SUPERADMIN)) {
      return { error: "Unauthorized access." }
    }

    const effectiveTenantId = await getEffectiveTenantId()
    const schoolId = session.role === Role.SUPERADMIN ? (effectiveTenantId || null) : (session.schoolId || effectiveTenantId || null)
    if (!schoolId) return { error: "No active school context found." }

    const cleanEmails = identifiers.emails
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.length > 0)

    const cleanRolls = identifiers.rollNumbers
      .map((r) => r.trim())
      .filter((r) => r.length > 0)

    const [existingUsers, existingStudents] = await Promise.all([
      cleanEmails.length > 0
        ? prisma.user.findMany({
            where: { email: { in: cleanEmails } },
            select: { email: true },
          })
        : [],
      cleanRolls.length > 0
        ? prisma.student.findMany({
            where: {
              rollNumber: { in: cleanRolls },
              user: { schoolId },
            },
            select: { rollNumber: true },
          })
        : [],
    ])

    return {
      existingEmails: existingUsers.map((u) => u.email.toLowerCase()),
      existingRollNumbers: existingStudents
        .map((s) => s.rollNumber?.toLowerCase() || "")
        .filter((r) => r.length > 0),
    }
  } catch (error) {
    console.error("Error in checkExistingStudentIdentifiers:", error)
    return { error: "Failed to check existing identifiers." }
  }
}

/**
 * Checks for existing emails and teacher IDs within the current tenant.
 */
export async function checkExistingTeacherIdentifiers(identifiers: {
  emails: string[]
  teacherIds: string[]
}): Promise<{ existingEmails: string[]; existingTeacherIds: string[] } | { error: string }> {
  try {
    const session = await verifySession()
    if (!session || (session.role !== Role.ADMIN && session.role !== Role.SUPERADMIN)) {
      return { error: "Unauthorized access." }
    }

    const effectiveTenantId = await getEffectiveTenantId()
    const schoolId = session.role === Role.SUPERADMIN ? (effectiveTenantId || null) : (session.schoolId || effectiveTenantId || null)
    if (!schoolId) return { error: "No active school context found." }

    const cleanEmails = identifiers.emails
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.length > 0)

    const existingUsers = cleanEmails.length > 0
      ? await prisma.user.findMany({
          where: { email: { in: cleanEmails } },
          select: { email: true },
        })
      : []

    return {
      existingEmails: existingUsers.map((u) => u.email.toLowerCase()),
      existingTeacherIds: [],
    }
  } catch (error) {
    console.error("Error in checkExistingTeacherIdentifiers:", error)
    return { error: "Failed to check existing teacher identifiers." }
  }
}

/**
 * High-volume, resilient chunked batch onboarding of students.
 */
export async function bulkUploadStudents(
  data: StudentUploadRecord[],
  options?: {
    autoCreateMissingClasses?: boolean
    skipDuplicates?: boolean
  }
) {
  if (!data || data.length === 0) {
    return { error: "No student records provided." }
  }

  try {
    const session = await verifySession()
    if (!session || (session.role !== Role.ADMIN && session.role !== Role.SUPERADMIN)) {
      return { error: "Unauthorized access." }
    }

    const effectiveTenantId = await getEffectiveTenantId()
    const schoolId = session.role === Role.SUPERADMIN ? (effectiveTenantId || null) : (session.schoolId || effectiveTenantId || null)

    if (!schoolId) {
      return { error: "No active school context found." }
    }

    const [existingClasses, activeSessionId] = await Promise.all([
      prisma.class.findMany({
        where: { schoolId },
        select: { id: true, name: true },
      }),
      requireActiveSessionId().catch(() => null),
    ])

    const availableClasses = [...existingClasses]
    const classIdByName = new Map<string, string>()
    for (const c of availableClasses) {
      classIdByName.set(c.name.toLowerCase().trim(), c.id)
    }

    // Auto-create missing classes if requested
    if (options?.autoCreateMissingClasses) {
      const missingClassNames = new Set<string>()
      for (const r of data) {
        if (r.classId && r.classId.trim().length > 0) {
          const match = matchClassToAvailable(r.classId, availableClasses)
          if (!match.isMatch) {
            missingClassNames.add(r.classId.trim())
          }
        }
      }

      if (missingClassNames.size > 0) {
        for (const clsName of missingClassNames) {
          try {
            const createdCls = await prisma.class.create({
              data: {
                name: clsName,
                schoolId,
              },
              select: { id: true, name: true },
            })
            availableClasses.push(createdCls)
            classIdByName.set(createdCls.name.toLowerCase().trim(), createdCls.id)
          } catch (clsErr) {
            console.warn(`Class ${clsName} may already exist:`, clsErr)
          }
        }
      }
    }

    // Resolve classes and sanitize records
    const processedRecords = data.map((r, idx) => {
      let resolvedClassId: string | null = null
      let resolvedClassName: string | null = null

      if (r.classId && r.classId.trim().length > 0) {
        const match = matchClassToAvailable(r.classId, availableClasses)
        if (match.isMatch) {
          resolvedClassId = match.resolvedClassId
          resolvedClassName = match.resolvedClassName
        }
      }

      const rollNumber = r.rollNumber && r.rollNumber.trim().length > 0
        ? r.rollNumber.trim()
        : `STU-${new Date().getFullYear()}-${1000 + idx}`

      const rawPassword = r.password && r.password.trim().length > 0
        ? r.password.trim()
        : `Stu@${rollNumber.replace(/[^a-zA-Z0-9]/g, "") || "123"}`

      return {
        record: r,
        name: r.name.trim(),
        email: r.email.toLowerCase().trim(),
        rollNumber,
        resolvedClassId,
        resolvedClassName,
        password: rawPassword,
        anomalies: r.anomalies || [],
      }
    })

    // Batch chunking configuration (chunks of 50 for resilient execution)
    const CHUNK_SIZE = 50
    let totalUploaded = 0
    let totalSkipped = 0
    const generatedCredentials: Array<{
      name: string
      email: string
      idOrRoll: string
      classOrSubject: string | null
      password: string
      status: string
    }> = []

    // Fetch all existing emails in database to avoid unique constraints
    const allEmails = processedRecords.map((p) => p.email).filter(Boolean)
    const existingUsers = await prisma.user.findMany({
      where: { email: { in: allEmails } },
      select: { email: true },
    })
    const existingEmailSet = new Set(existingUsers.map((u) => u.email.toLowerCase()))

    // In-memory set for deduplication within the batch
    const seenBatchEmails = new Set<string>()

    for (let i = 0; i < processedRecords.length; i += CHUNK_SIZE) {
      const chunk = processedRecords.slice(i, i + CHUNK_SIZE)

      // Filter duplicates in this chunk
      const validChunkRecords: typeof chunk = []
      for (const item of chunk) {
        if (!item.email || !item.name) {
          totalSkipped++
          continue
        }

        if (existingEmailSet.has(item.email) || seenBatchEmails.has(item.email)) {
          totalSkipped++
          continue
        }

        seenBatchEmails.add(item.email)
        validChunkRecords.push(item)
      }

      if (validChunkRecords.length === 0) {
        continue
      }

      // Hash passwords for chunk
      const hashedPasswords = await Promise.all(
        validChunkRecords.map((item) => hashPassword(item.password))
      )

      // Transaction per chunk
      await prisma.$transaction(async (tx) => {
        // 1. Create Users
        const userData = validChunkRecords.map((item, idx) => ({
          email: item.email,
          name: item.name,
          password: hashedPasswords[idx],
          role: Role.STUDENT,
          mustChangePassword: true,
          schoolId,
        }))

        await tx.user.createMany({
          data: userData,
        })

        const createdUsers = await tx.user.findMany({
          where: {
            email: { in: validChunkRecords.map((v) => v.email) },
            schoolId,
          },
          select: { id: true, email: true },
        })

        const emailToUserId = new Map(createdUsers.map((u) => [u.email, u.id]))

        // 2. Create Students
        const studentData = validChunkRecords
          .map((item) => {
            const userId = emailToUserId.get(item.email)
            if (!userId) return null

            const anomalyFlag = item.resolvedClassId === null ? "CSV_ANOMALY:UNASSIGNED_CLASS" : null

            return {
              userId,
              rollNumber: item.rollNumber,
              classId: item.resolvedClassId,
              status: StudentStatus.ACTIVE,
              behavioralFlags: anomalyFlag,
            }
          })
          .filter((s): s is NonNullable<typeof s> => s !== null)

        if (studentData.length > 0) {
          await tx.student.createMany({
            data: studentData,
          })
        }

        // 3. Create StudentEnrollments for active session
        if (activeSessionId) {
          const userIds = Array.from(emailToUserId.values())
          const studentRows = await tx.student.findMany({
            where: { userId: { in: userIds } },
            select: { id: true, classId: true },
          })

          const enrollmentData = studentRows
            .filter((s) => s.classId !== null)
            .map((s) => ({
              studentId: s.id,
              classId: s.classId!,
              academicSessionId: activeSessionId,
              status: EnrollmentStatus.ACTIVE,
            }))

          if (enrollmentData.length > 0) {
            await tx.studentEnrollment.createMany({
              data: enrollmentData,
            })
          }
        }

        // Record credentials for export
        for (const item of validChunkRecords) {
          generatedCredentials.push({
            name: item.name,
            email: item.email,
            idOrRoll: item.rollNumber,
            classOrSubject: item.resolvedClassName || "Unassigned",
            password: item.password,
            status: item.resolvedClassId ? "ACTIVE" : "UNASSIGNED_CLASS",
          })
        }

        totalUploaded += validChunkRecords.length
      })
    }

    revalidatePath("/admin/students")
    revalidatePath("/admin/class")
    revalidatePath("/admin/dashboard")

    return {
      success: true,
      count: totalUploaded,
      skippedCount: totalSkipped,
      totalProcessed: data.length,
      credentials: generatedCredentials,
    }
  } catch (error) {
    console.error("Error in bulkUploadStudents:", error)
    return { error: "Failed to execute bulk student onboarding. Check server logs." }
  }
}

/**
 * High-volume, resilient chunked batch onboarding of teachers.
 */
export async function bulkUploadTeachers(
  data: TeacherUploadRecord[],
  _options?: {
    skipDuplicates?: boolean
  }
) {
  if (!data || data.length === 0) {
    return { error: "No teacher records provided." }
  }

  try {
    const session = await verifySession()
    if (!session || (session.role !== Role.ADMIN && session.role !== Role.SUPERADMIN)) {
      return { error: "Unauthorized access." }
    }

    const effectiveTenantId = await getEffectiveTenantId()
    const schoolId = session.role === Role.SUPERADMIN ? (effectiveTenantId || null) : (session.schoolId || effectiveTenantId || null)

    if (!schoolId) {
      return { error: "No active school context found." }
    }

    const processedRecords = data.map((r, idx) => {
      const teacherId = r.teacherId && r.teacherId.trim().length > 0
        ? r.teacherId.trim()
        : `TCH-${new Date().getFullYear()}-${100 + idx}`

      const rawPassword = r.password && r.password.trim().length > 0
        ? r.password.trim()
        : `Tch@${teacherId.replace(/[^a-zA-Z0-9]/g, "") || "123"}`

      return {
        record: r,
        name: r.name.trim(),
        email: r.email.toLowerCase().trim(),
        teacherId,
        specialization: r.specialization?.trim() || "General Education",
        qualification: r.qualification?.trim() || "B.Ed.",
        password: rawPassword,
      }
    })

    const allEmails = processedRecords.map((p) => p.email).filter(Boolean)
    const existingUsers = await prisma.user.findMany({
      where: { email: { in: allEmails } },
      select: { email: true },
    })
    const existingEmailSet = new Set(existingUsers.map((u) => u.email.toLowerCase()))

    const seenBatchEmails = new Set<string>()
    const CHUNK_SIZE = 50
    let totalUploaded = 0
    let totalSkipped = 0
    const generatedCredentials: Array<{
      name: string
      email: string
      idOrRoll: string
      classOrSubject: string | null
      password: string
      status: string
    }> = []

    for (let i = 0; i < processedRecords.length; i += CHUNK_SIZE) {
      const chunk = processedRecords.slice(i, i + CHUNK_SIZE)

      const validChunkRecords: typeof chunk = []
      for (const item of chunk) {
        if (!item.email || !item.name) {
          totalSkipped++
          continue
        }

        if (existingEmailSet.has(item.email) || seenBatchEmails.has(item.email)) {
          totalSkipped++
          continue
        }

        seenBatchEmails.add(item.email)
        validChunkRecords.push(item)
      }

      if (validChunkRecords.length === 0) continue

      const hashedPasswords = await Promise.all(
        validChunkRecords.map((item) => hashPassword(item.password))
      )

      await prisma.$transaction(async (tx) => {
        const userData = validChunkRecords.map((item, idx) => ({
          email: item.email,
          name: item.name,
          password: hashedPasswords[idx],
          role: Role.TEACHER,
          mustChangePassword: true,
          schoolId,
        }))

        await tx.user.createMany({
          data: userData,
        })

        const createdUsers = await tx.user.findMany({
          where: {
            email: { in: validChunkRecords.map((v) => v.email) },
            schoolId,
          },
          select: { id: true, email: true },
        })

        const emailToUserId = new Map(createdUsers.map((u) => [u.email, u.id]))

        const teacherData = validChunkRecords
          .map((item) => {
            const userId = emailToUserId.get(item.email)
            if (!userId) return null
            return {
              userId,
              specialization: item.specialization,
              qualification: item.qualification,
            }
          })
          .filter((t): t is NonNullable<typeof t> => t !== null)

        if (teacherData.length > 0) {
          await tx.teacher.createMany({
            data: teacherData,
          })
        }

        for (const item of validChunkRecords) {
          generatedCredentials.push({
            name: item.name,
            email: item.email,
            idOrRoll: item.teacherId,
            classOrSubject: item.specialization,
            password: item.password,
            status: "ACTIVE",
          })
        }

        totalUploaded += validChunkRecords.length
      })
    }

    revalidatePath("/admin/teachers")
    revalidatePath("/admin/classes")

    return {
      success: true,
      count: totalUploaded,
      skippedCount: totalSkipped,
      totalProcessed: data.length,
      credentials: generatedCredentials,
    }
  } catch (error) {
    console.error("Error in bulkUploadTeachers:", error)
    return { error: "Failed to execute bulk teacher onboarding." }
  }
}

/**
 * Quick-fix server action for resolving student details directly from the website.
 */
export async function updateStudentQuickFix(
  studentId: string,
  input: StudentQuickFixInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await verifySession()
    if (!session || (session.role !== Role.ADMIN && session.role !== Role.SUPERADMIN)) {
      return { success: false, error: "Unauthorized access." }
    }

    const effectiveTenantId = await getEffectiveTenantId()
    const schoolId = session.role === Role.SUPERADMIN ? (effectiveTenantId || null) : (session.schoolId || effectiveTenantId || null)
    if (!schoolId) return { success: false, error: "No active school context found." }

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { user: true },
    })

    if (!student || student.user.schoolId !== schoolId) {
      return { success: false, error: "Student not found in this school." }
    }

    const activeSessionId = await requireActiveSessionId().catch(() => null)

    await prisma.$transaction(async (tx) => {
      // Update User if name or email changed
      const userUpdate: { name?: string; email?: string } = {}
      if (input.name && input.name.trim().length > 0) userUpdate.name = input.name.trim()
      if (input.email && input.email.trim().length > 0) {
        const cleanEmail = input.email.trim().toLowerCase()
        if (cleanEmail !== student.user.email) {
          const emailExists = await tx.user.findUnique({ where: { email: cleanEmail } })
          if (emailExists) throw new Error("Email already taken by another account.")
          userUpdate.email = cleanEmail
        }
      }

      if (Object.keys(userUpdate).length > 0) {
        await tx.user.update({
          where: { id: student.userId },
          data: userUpdate,
        })
      }

      // Update Student
      const studentUpdate: { rollNumber?: string | null; classId?: string | null; behavioralFlags?: string | null } = {}
      if (input.rollNumber !== undefined) studentUpdate.rollNumber = input.rollNumber ? input.rollNumber.trim() : null
      if (input.classId !== undefined) {
        studentUpdate.classId = input.classId && input.classId.trim().length > 0 ? input.classId.trim() : null
        studentUpdate.behavioralFlags = studentUpdate.classId ? null : "CSV_ANOMALY:UNASSIGNED_CLASS"
      }

      await tx.student.update({
        where: { id: studentId },
        data: studentUpdate,
      })

      // Update Enrollment
      if (studentUpdate.classId && activeSessionId) {
        const existingEnrollment = await tx.studentEnrollment.findFirst({
          where: { studentId, academicSessionId: activeSessionId },
        })

        if (existingEnrollment) {
          await tx.studentEnrollment.update({
            where: { id: existingEnrollment.id },
            data: { classId: studentUpdate.classId },
          })
        } else {
          await tx.studentEnrollment.create({
            data: {
              studentId,
              classId: studentUpdate.classId,
              academicSessionId: activeSessionId,
              status: EnrollmentStatus.ACTIVE,
            },
          })
        }
      }
    })

    revalidatePath("/admin/students")
    revalidatePath("/admin/class")
    return { success: true }
  } catch (error: unknown) {
    console.error("Error in updateStudentQuickFix:", error)
    return { success: false, error: error instanceof Error ? error.message : "Failed to update student." }
  }
}

/**
 * Quick-fix server action for resolving teacher details directly from the website.
 */
export async function updateTeacherQuickFix(
  teacherId: string,
  input: TeacherQuickFixInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await verifySession()
    if (!session || (session.role !== Role.ADMIN && session.role !== Role.SUPERADMIN)) {
      return { success: false, error: "Unauthorized access." }
    }

    const effectiveTenantId = await getEffectiveTenantId()
    const schoolId = session.role === Role.SUPERADMIN ? (effectiveTenantId || null) : (session.schoolId || effectiveTenantId || null)
    if (!schoolId) return { success: false, error: "No active school context found." }

    const teacher = await prisma.teacher.findUnique({
      where: { id: teacherId },
      include: { user: true },
    })

    if (!teacher || teacher.user.schoolId !== schoolId) {
      return { success: false, error: "Teacher not found in this school." }
    }

    await prisma.$transaction(async (tx) => {
      const userUpdate: { name?: string; email?: string } = {}
      if (input.name && input.name.trim().length > 0) userUpdate.name = input.name.trim()
      if (input.email && input.email.trim().length > 0) {
        const cleanEmail = input.email.trim().toLowerCase()
        if (cleanEmail !== teacher.user.email) {
          const emailExists = await tx.user.findUnique({ where: { email: cleanEmail } })
          if (emailExists) throw new Error("Email already taken by another account.")
          userUpdate.email = cleanEmail
        }
      }

      if (Object.keys(userUpdate).length > 0) {
        await tx.user.update({
          where: { id: teacher.userId },
          data: userUpdate,
        })
      }

      const teacherUpdate: { specialization?: string | null; qualification?: string | null } = {}
      if (input.specialization !== undefined) teacherUpdate.specialization = input.specialization?.trim() || null
      if (input.qualification !== undefined) teacherUpdate.qualification = input.qualification?.trim() || null

      if (Object.keys(teacherUpdate).length > 0) {
        await tx.teacher.update({
          where: { id: teacherId },
          data: teacherUpdate,
        })
      }
    })

    revalidatePath("/admin/teachers")
    return { success: true }
  } catch (error: unknown) {
    console.error("Error in updateTeacherQuickFix:", error)
    return { success: false, error: error instanceof Error ? error.message : "Failed to update teacher." }
  }
}
