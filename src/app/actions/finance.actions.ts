"use server"

import prisma from "@/lib/prisma"
import { verifySession } from "@/lib/auth/session"
import { Role, TransactionType, TransactionStatus } from "@prisma/client"
import { revalidatePath } from "next/cache"
import { enforceModuleAccess } from "@/app/actions/entitlements.actions"

export interface CreateFeeStructureInput {
  title: string
  amount: number
  dueDate: Date | string
  classId?: string
  schoolId?: string
}

export interface RecordTransactionInput {
  userId: string
  amount: number
  type: TransactionType
  status?: TransactionStatus
  title: string
  description?: string
  referenceId?: string
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

export async function createFeeStructure(data: CreateFeeStructureInput) {
  const { session, schoolId } = await resolveTenantContext(data.schoolId)
  if (session.role !== Role.ADMIN && session.role !== Role.SUPERADMIN) {
    throw new Error("Unauthorized: Administrative privileges required.")
  }
  await enforceModuleAccess("FINANCE")

  if (!schoolId) {
    throw new Error("School context required to create a fee structure.")
  }

  if (!data.title || data.title.trim().length === 0) {
    throw new Error("Fee title is required.")
  }

  if (typeof data.amount !== "number" || data.amount <= 0) {
    throw new Error("Fee amount must be a positive number.")
  }

  const feeStructure = await prisma.feeStructure.create({
    data: {
      title: data.title.trim(),
      amount: data.amount,
      dueDate: new Date(data.dueDate),
      classId: data.classId || null,
      schoolId,
    },
    include: {
      class: { select: { name: true } },
    },
  })

  revalidatePath("/admin/finance")
  return feeStructure
}

export async function getFeeStructures(overrideSchoolId?: string) {
  try {
    const { session, schoolId } = await resolveTenantContext(overrideSchoolId)
    if (session.role !== Role.ADMIN && session.role !== Role.SUPERADMIN) {
      return []
    }

    return await prisma.feeStructure.findMany({
      where: schoolId ? { schoolId } : {},
      include: {
        class: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    })
  } catch (err) {
    return []
  }
}

export async function recordTransaction(data: RecordTransactionInput) {
  const { session, schoolId } = await resolveTenantContext(data.schoolId)
  if (session.role !== Role.ADMIN && session.role !== Role.SUPERADMIN) {
    throw new Error("Unauthorized: Administrative privileges required.")
  }
  await enforceModuleAccess("FINANCE")

  if (!schoolId) {
    throw new Error("School context required to record transaction.")
  }

  if (!data.title || data.title.trim().length === 0) {
    throw new Error("Transaction title is required.")
  }

  if (typeof data.amount !== "number" || data.amount <= 0) {
    throw new Error("Transaction amount must be a positive number.")
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: data.userId },
    select: { id: true, schoolId: true },
  })

  if (!targetUser) {
    throw new Error("Target user not found.")
  }

  if (session.role !== Role.SUPERADMIN && targetUser.schoolId !== schoolId) {
    throw new Error("Security Violation: Target user does not belong to your school tenant.")
  }

  const transaction = await prisma.transaction.create({
    data: {
      title: data.title.trim(),
      amount: data.amount,
      type: data.type,
      status: data.status || TransactionStatus.COMPLETED,
      description: data.description?.trim() || null,
      referenceId: data.referenceId?.trim() || null,
      userId: data.userId,
      schoolId: targetUser.schoolId || schoolId,
    },
    include: {
      user: { select: { id: true, name: true, email: true, role: true } },
    },
  })

  revalidatePath("/admin/finance")
  return transaction
}

export async function getTransactions(overrideSchoolId?: string) {
  try {
    const { session, schoolId } = await resolveTenantContext(overrideSchoolId)
    if (session.role !== Role.ADMIN && session.role !== Role.SUPERADMIN) {
      return []
    }

    return await prisma.transaction.findMany({
      where: schoolId ? { schoolId } : {},
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })
  } catch (err) {
    return []
  }
}
