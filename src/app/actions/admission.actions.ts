"use server"

import crypto from "crypto"
import bcrypt from "bcryptjs"
import prisma from "@/lib/prisma"
import { verifySession } from "@/lib/auth/session"
import { Role, AdmissionStatus } from "@prisma/client"
import { revalidatePath } from "next/cache"

export interface SubmitAdmissionEnquiryInput {
  schoolId: string
  studentFirstName: string
  studentLastName: string
  dateOfBirth: Date | string
  appliedForClassId: string
  parentName: string
  parentEmail: string
  parentPhone: string
  documentUrl?: string
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
// PUBLIC ADMISSION ENQUIRY SUBMISSION
// ============================================================

export async function submitAdmissionEnquiry(data: SubmitAdmissionEnquiryInput) {
  if (!data.schoolId || data.schoolId.trim().length === 0) {
    throw new Error("Target school ID is required.")
  }

  const school = await prisma.school.findUnique({
    where: { id: data.schoolId },
    select: { id: true, name: true },
  })

  if (!school) {
    throw new Error("Invalid school ID: Target school does not exist.")
  }

  if (!data.appliedForClassId) {
    throw new Error("Class selection is required for admission.")
  }

  const targetClass = await prisma.class.findUnique({
    where: { id: data.appliedForClassId },
    select: { id: true, schoolId: true },
  })

  if (!targetClass) {
    throw new Error("Invalid class selection.")
  }

  if (!data.studentFirstName || !data.studentLastName) {
    throw new Error("Student first and last names are required.")
  }

  if (!data.parentName || !data.parentEmail || !data.parentPhone) {
    throw new Error("Parent contact details are required.")
  }

  const dob = new Date(data.dateOfBirth)
  if (isNaN(dob.getTime())) {
    throw new Error("Invalid date of birth.")
  }

  // Generate unique reference number (ADM-XXXXXX)
  let referenceNumber = ""
  let isUnique = false
  let attempts = 0

  while (!isUnique && attempts < 5) {
    attempts++
    const randomHex = crypto.randomBytes(3).toString("hex").toUpperCase()
    referenceNumber = `ADM-${randomHex}`

    const existing = await prisma.admissionEnquiry.findUnique({
      where: { referenceNumber },
      select: { id: true },
    })
    if (!existing) {
      isUnique = true
    }
  }

  if (!isUnique) {
    throw new Error("System error generating reference number. Please try again.")
  }

  const enquiry = await prisma.admissionEnquiry.create({
    data: {
      schoolId: data.schoolId,
      referenceNumber,
      studentFirstName: data.studentFirstName.trim(),
      studentLastName: data.studentLastName.trim(),
      dateOfBirth: dob,
      appliedForClassId: data.appliedForClassId,
      parentName: data.parentName.trim(),
      parentEmail: data.parentEmail.trim().toLowerCase(),
      parentPhone: data.parentPhone.trim(),
      status: AdmissionStatus.PENDING,
      documentUrl: data.documentUrl?.trim() || null,
    },
    include: {
      appliedForClass: { select: { id: true, name: true } },
    },
  })

  try {
    revalidatePath("/admin/admissions")
  } catch {}
  return {
    success: true,
    referenceNumber: enquiry.referenceNumber,
    enquiryId: enquiry.id,
  }
}

// ============================================================
// ADMIN REVIEW & STATUS ACTIONS
// ============================================================

export async function getAdmissionEnquiries(overrideSchoolId?: string) {
  try {
    const { session, schoolId } = await resolveTenantContext(overrideSchoolId)

    if (session.role !== Role.ADMIN && session.role !== Role.SUPERADMIN) {
      return []
    }

    return await prisma.admissionEnquiry.findMany({
      where: schoolId ? { schoolId } : {},
      include: {
        appliedForClass: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    })
  } catch (err) {
    return []
  }
}

export async function updateAdmissionStatus(
  enquiryId: string,
  status: "REVIEWING" | "REJECTED",
  adminNotes?: string
) {
  const { session, schoolId } = await resolveTenantContext()

  if (session.role !== Role.ADMIN && session.role !== Role.SUPERADMIN) {
    throw new Error("Unauthorized: Administrative privileges required.")
  }

  const existing = await prisma.admissionEnquiry.findUnique({
    where: { id: enquiryId },
    select: { id: true, schoolId: true, status: true },
  })

  if (!existing) {
    throw new Error("Admission enquiry not found.")
  }

  if (session.role !== Role.SUPERADMIN && existing.schoolId !== schoolId) {
    throw new Error("Security Violation: Admission enquiry belongs to another tenant.")
  }

  if (existing.status === AdmissionStatus.APPROVED) {
    throw new Error("Cannot change status of an already approved admission.")
  }

  const targetStatus =
    status === "REVIEWING" ? AdmissionStatus.REVIEWING : AdmissionStatus.REJECTED

  const updated = await prisma.admissionEnquiry.update({
    where: { id: enquiryId },
    data: {
      status: targetStatus,
      adminNotes: adminNotes?.trim() || undefined,
    },
    include: {
      appliedForClass: { select: { id: true, name: true } },
    },
  })

  try {
    revalidatePath("/admin/admissions")
  } catch {}
  return updated
}

// ============================================================
// CONVERSION ENGINE (ATOMIC PRISMA TRANSACTION)
// ============================================================

export async function approveAndConvertAdmission(enquiryId: string) {
  const { session, schoolId } = await resolveTenantContext()

  if (session.role !== Role.ADMIN && session.role !== Role.SUPERADMIN) {
    throw new Error("Unauthorized: Administrative privileges required.")
  }

  const enquiry = await prisma.admissionEnquiry.findUnique({
    where: { id: enquiryId },
    include: {
      appliedForClass: { select: { id: true, name: true } },
    },
  })

  if (!enquiry) {
    throw new Error("Admission enquiry not found.")
  }

  if (session.role !== Role.SUPERADMIN && enquiry.schoolId !== schoolId) {
    throw new Error("Security Violation: Admission enquiry belongs to another tenant.")
  }

  if (enquiry.status === AdmissionStatus.APPROVED) {
    throw new Error("Application has already been converted to an active Student account.")
  }

  // Generate synthetic guaranteed-unique email for the student login
  const sanitizedFirst = enquiry.studentFirstName.toLowerCase().replace(/[^a-z0-9]/g, "")
  const sanitizedRef = enquiry.referenceNumber.toLowerCase().replace(/[^a-z0-9]/g, "")
  const studentEmail = `${sanitizedFirst}.${sanitizedRef}@student.local`

  const defaultPasswordStr = "Student@12345"
  const hashedPassword = await bcrypt.hash(defaultPasswordStr, 10)
  const studentFullName = `${enquiry.studentFirstName} ${enquiry.studentLastName}`.trim()

  // Atomic Transaction: Update Enquiry -> Create User -> Create Student
  const result = await prisma.$transaction(async (tx) => {
    // 1. Mark AdmissionEnquiry as APPROVED
    const updatedEnquiry = await tx.admissionEnquiry.update({
      where: { id: enquiryId },
      data: {
        status: AdmissionStatus.APPROVED,
      },
    })

    // 2. Create User account for student
    const newUser = await tx.user.create({
      data: {
        email: studentEmail,
        name: studentFullName,
        password: hashedPassword,
        role: Role.STUDENT,
        mustChangePassword: true,
        schoolId: enquiry.schoolId,
      },
    })

    // 3. Create Student profile
    const newStudent = await tx.student.create({
      data: {
        userId: newUser.id,
        classId: enquiry.appliedForClassId,
        emergencyContactName: enquiry.parentName,
        emergencyContactPhone: enquiry.parentPhone,
        emergencyContactRelation: "Parent",
      },
    })

    return {
      updatedEnquiry,
      user: newUser,
      student: newStudent,
    }
  })

  try {
    revalidatePath("/admin/admissions")
    revalidatePath("/admin/students")
  } catch {}

  return {
    success: true,
    email: result.user.email,
    tempPassword: defaultPasswordStr,
    studentId: result.student.id,
    referenceNumber: enquiry.referenceNumber,
    studentName: studentFullName,
  }
}
