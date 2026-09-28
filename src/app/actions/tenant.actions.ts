"use server"

import prisma from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { verifySession } from "@/lib/auth/session"
import { Role } from "@prisma/client"

export interface CreateSchoolInput {
  name: string
  domain?: string
  address?: string
}

export interface ProvisionTenantAdminInput {
  name: string
  email: string
  schoolId: string
}

export async function createSchool(data: CreateSchoolInput) {
  const session = await verifySession()
  if (!session || session.role !== Role.SUPERADMIN) {
    throw new Error("Unauthorized: SuperAdmin access required.")
  }

  if (!data.name || data.name.trim().length === 0) {
    throw new Error("School name is required.")
  }

  const school = await prisma.school.create({
    data: {
      name: data.name.trim(),
      domain: data.domain?.trim() || null,
      address: data.address?.trim() || null,
    },
  })

  return { id: school.id }
}

export async function getSchools() {
  const session = await verifySession()
  if (!session || session.role !== Role.SUPERADMIN) {
    throw new Error("Unauthorized: SuperAdmin access required.")
  }

  return prisma.school.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: {
          users: true,
          classes: true,
          academicSessions: true,
        },
      },
    },
  })
}

export async function provisionTenantAdmin(data: ProvisionTenantAdminInput) {
  const session = await verifySession()
  if (!session || session.role !== Role.SUPERADMIN) {
    throw new Error("Unauthorized: SuperAdmin access required.")
  }

  if (!data.name || data.name.trim().length === 0) {
    throw new Error("Admin name is required.")
  }

  const email = data.email.trim().toLowerCase()
  if (!email || !email.includes("@")) {
    throw new Error("Valid email address is required.")
  }

  const school = await prisma.school.findUnique({
    where: { id: data.schoolId },
    select: { id: true },
  })

  if (!school) {
    throw new Error("Target school tenant not found.")
  }

  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  })

  if (existingUser) {
    throw new Error("A user with this email address already exists.")
  }

  const hashedPassword = await bcrypt.hash("Admin@12345", 10)

  const user = await prisma.user.create({
    data: {
      name: data.name.trim(),
      email,
      password: hashedPassword,
      role: Role.ADMIN,
      mustChangePassword: true,
      schoolId: data.schoolId,
    },
    select: {
      id: true,
      email: true,
      name: true,
    },
  })

  return { success: true, userId: user.id }
}
