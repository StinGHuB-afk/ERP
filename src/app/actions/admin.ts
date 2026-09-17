"use server"

import crypto from "crypto"
import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import bcrypt from "bcryptjs"
import { studentSchema, teacherSchema, classSchema, subjectSchema } from "@/lib/validations"
import { verifySession } from "@/lib/auth/session"

async function checkAdmin() {
  const session = await verifySession()
  return session?.role === "ADMIN"
}

async function getActiveSessionId() {
  const settings = await prisma.schoolSettings.findUnique({ where: { id: "default" }, select: { activeSessionId: true } })
  return settings?.activeSessionId
}

export async function createStudent(formData: FormData) {
  if (!(await checkAdmin())) return { error: "Unauthorized" }
  const parsed = studentSchema.safeParse(Object.fromEntries(formData.entries()))
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  try {
    const password = await bcrypt.hash("Student@12345", 10)
    const activeSessionId = await getActiveSessionId()

    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email: parsed.data.email, name: parsed.data.name, password, role: "STUDENT", mustChangePassword: true }
      })
      const student = await tx.student.create({ data: { userId: user.id, classId: parsed.data.classId } })

      if (activeSessionId && parsed.data.classId) {
        await tx.studentEnrollment.create({
          data: { studentId: student.id, classId: parsed.data.classId, academicSessionId: activeSessionId }
        })
      }
    })
    revalidatePath("/admin/students")
    return { success: true }
  } catch {
    return { error: "Failed to create student. Email might already exist." }
  }
}

export async function createTeacher(formData: FormData) {
  if (!(await checkAdmin())) return { error: "Unauthorized" }
  const parsed = teacherSchema.safeParse(Object.fromEntries(formData.entries()))
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  try {
    const password = await bcrypt.hash("Teacher@12345", 10)
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email: parsed.data.email, name: parsed.data.name, password, role: "TEACHER", mustChangePassword: true }
      })
      await tx.teacher.create({ data: { userId: user.id } })
    })
    revalidatePath("/admin/teachers")
    return { success: true }
  } catch {
    return { error: "Failed to create teacher. Email might already exist." }
  }
}

export async function createClass(formData: FormData) {
  if (!(await checkAdmin())) return { error: "Unauthorized" }
  const parsed = classSchema.safeParse(Object.fromEntries(formData.entries()))
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  try {
    await prisma.class.create({ data: { name: parsed.data.name, teacherId: parsed.data.teacherId || null } })
    revalidatePath("/admin/classes")
    return { success: true }
  } catch {
    return { error: "Failed to create class. Name might already exist." }
  }
}

export async function createSubject(formData: FormData) {
  if (!(await checkAdmin())) return { error: "Unauthorized" }
  const parsed = subjectSchema.safeParse(Object.fromEntries(formData.entries()))
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  try {
    await prisma.subject.create({ data: { name: parsed.data.name, code: parsed.data.code, teacherId: parsed.data.teacherId || null } })
    revalidatePath("/admin/subjects")
    return { success: true }
  } catch {
    return { error: "Failed to create subject. Code or Name might already exist." }
  }
}

async function deleteEntity(model: "user" | "class" | "subject", id: string, path: string) {
  if (!(await checkAdmin())) return { error: "Unauthorized" }
  try {
    await (prisma[model] as any).delete({ where: { id } })
    revalidatePath(path)
    return { success: true }
  } catch {
    return { error: `Failed to delete ${model}.` }
  }
}

export async function deleteStudent(id: string) {
  return await deleteEntity("user", id, "/admin/students")
}

export async function deleteTeacher(id: string) {
  return await deleteEntity("user", id, "/admin/teachers")
}

export async function deleteClass(id: string) {
  return await deleteEntity("class", id, "/admin/classes")
}

export async function deleteSubject(id: string) {
  return await deleteEntity("subject", id, "/admin/subjects")
}

export async function assignClassTeacher(teacherId: string, classId: string) {
  if (!(await checkAdmin())) return { error: "Unauthorized" }
  const activeSessionId = await getActiveSessionId()
  if (!activeSessionId) return { error: "No active academic session." }

  try {
    await prisma.$transaction([
      prisma.classTeacherAssignment.updateMany({
        where: { OR: [{ classId }, { teacherId }], academicSessionId: activeSessionId, isActive: true },
        data: { isActive: false, endedAt: new Date() }
      }),
      prisma.classTeacherAssignment.create({
        data: { teacherId, classId, academicSessionId: activeSessionId, isActive: true }
      }),
      prisma.class.updateMany({ where: { teacherId }, data: { teacherId: null } }),
      prisma.class.update({ where: { id: classId }, data: { teacherId } })
    ])

    revalidatePath("/admin/teachers")
    revalidatePath("/teacher/class", "layout")
    return { success: true }
  } catch {
    return { error: "Failed to assign class teacher." }
  }
}

export async function removeClassTeacherAssignment(assignmentId: string) {
  if (!(await checkAdmin())) return { error: "Unauthorized" }
  try {
    const assignment = await prisma.classTeacherAssignment.findUnique({ where: { id: assignmentId } })
    if (!assignment) return { error: "Assignment not found." }

    await prisma.classTeacherAssignment.update({ where: { id: assignmentId }, data: { isActive: false, endedAt: new Date() } })
    if (assignment.isActive) await prisma.class.update({ where: { id: assignment.classId }, data: { teacherId: null } })

    revalidatePath("/admin/teachers")
    return { success: true }
  } catch {
    return { error: "Failed to remove assignment." }
  }
}

export async function createTeachingAssignment(teacherId: string, subjectId: string, classId: string) {
  if (!(await checkAdmin())) return { error: "Unauthorized" }
  const activeSessionId = await getActiveSessionId()
  if (!activeSessionId) return { error: "No active academic session." }

  try {
    await prisma.$transaction([
      prisma.teachingAssignment.updateMany({
        where: { subjectId, classId, academicSessionId: activeSessionId, isActive: true },
        data: { isActive: false, endedAt: new Date() }
      }),
      prisma.teachingAssignment.create({
        data: { teacherId, subjectId, classId, academicSessionId: activeSessionId, isActive: true }
      })
    ])

    revalidatePath("/admin/teachers")
    return { success: true }
  } catch {
    return { error: "Failed to create teaching assignment." }
  }
}

export async function removeTeachingAssignment(assignmentId: string) {
  if (!(await checkAdmin())) return { error: "Unauthorized" }
  try {
    await prisma.teachingAssignment.update({ where: { id: assignmentId }, data: { isActive: false, endedAt: new Date() } })
    revalidatePath("/admin/teachers")
    return { success: true }
  } catch {
    return { error: "Failed to remove assignment." }
  }
}

export async function transferStudent(studentId: string, newClassId: string) {
  if (!(await checkAdmin())) return { error: "Unauthorized" }
  const activeSessionId = await getActiveSessionId()
  if (!activeSessionId) return { error: "No active academic session." }

  try {
    const current = await prisma.studentEnrollment.findFirst({
      where: { studentId, academicSessionId: activeSessionId, status: "ACTIVE" }
    })
    if (current?.classId === newClassId) return { error: "Student is already in this class." }

    await prisma.$transaction([
      ...(current ? [prisma.studentEnrollment.update({ where: { id: current.id }, data: { status: "TRANSFERRED" } })] : []),
      prisma.studentEnrollment.create({ data: { studentId, classId: newClassId, academicSessionId: activeSessionId, status: "ACTIVE" } }),
      prisma.student.update({ where: { id: studentId }, data: { classId: newClassId } })
    ])

    revalidatePath("/admin/students")
    return { success: true }
  } catch (error: any) {
    return { error: error.message || "Failed to transfer student." }
  }
}

export async function resetUserPassword(userId: string) {
  if (!(await checkAdmin())) return { error: "Unauthorized" }

  try {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } })
    if (!user) return { error: "User not found." }

    const tempPasswordStr = crypto.randomBytes(5).toString("hex")
    const password = await bcrypt.hash(tempPasswordStr, 10)

    await prisma.user.update({ where: { id: userId }, data: { password, mustChangePassword: true } })

    if (user.role === "STUDENT") revalidatePath("/admin/students")
    if (user.role === "TEACHER") revalidatePath("/admin/teachers")

    return { success: true, tempPassword: tempPasswordStr }
  } catch {
    return { error: "Failed to reset password." }
  }
}
