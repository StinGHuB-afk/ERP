"use server"

import prisma from "@/lib/prisma"
import { verifySession, getEffectiveTenantId } from "@/lib/auth/session"
import { Role, LeaveType, LeaveStatus, AssetCategory, AssetStatus } from "@prisma/client"
import { revalidatePath } from "next/cache"
import { enforceModuleAccess } from "@/app/actions/entitlements.actions"

export interface CreateLeaveRequestInput {
  type: LeaveType
  startDate: Date | string
  endDate: Date | string
  reason: string
}

export interface CreateAssetInput {
  name: string
  category: AssetCategory
  identifier?: string
  schoolId?: string
}

async function resolveTenantContext(overrideSchoolId?: string) {
  const session = await verifySession()
  if (!session) {
    throw new Error("Unauthorized: Authentication required.")
  }
  const effectiveTenantId = await getEffectiveTenantId()
  const schoolId = overrideSchoolId || effectiveTenantId || null

  if (session.role !== Role.SUPERADMIN && !schoolId) {
    throw new Error("Orphaned account: No school association found.")
  }

  return { session, schoolId }
}

// ============================================================
// LEAVE REQUEST STATE-MACHINE ACTIONS
// ============================================================

export async function createLeaveRequest(data: CreateLeaveRequestInput) {
  const { session, schoolId } = await resolveTenantContext()
  await enforceModuleAccess("LEAVES")

  if (!schoolId) {
    throw new Error("School context required to submit a leave request.")
  }

  if (!data.reason || data.reason.trim().length === 0) {
    throw new Error("Leave reason is required.")
  }

  const start = new Date(data.startDate)
  const end = new Date(data.endDate)

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new Error("Invalid start or end date.")
  }

  if (start > end) {
    throw new Error("Start date cannot be after end date.")
  }

  const leaveRequest = await prisma.leaveRequest.create({
    data: {
      schoolId,
      userId: session.userId,
      type: data.type,
      status: LeaveStatus.PENDING,
      startDate: start,
      endDate: end,
      reason: data.reason.trim(),
    },
    include: {
      user: { select: { id: true, name: true, email: true, role: true } },
    },
  })

  revalidatePath("/admin/operations")
  revalidatePath("/teacher/profile-requests")
  return leaveRequest
}

export async function getLeaveRequests(overrideSchoolId?: string) {
  try {
    const { session, schoolId } = await resolveTenantContext(overrideSchoolId)

    const isStaffAdmin = session.role === Role.ADMIN || session.role === Role.SUPERADMIN

    return await prisma.leaveRequest.findMany({
      where: {
        ...(schoolId ? { schoolId } : {}),
        ...(!isStaffAdmin ? { userId: session.userId } : {}),
      },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
        reviewer: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    })
  } catch (err) {
    return []
  }
}

export async function reviewLeaveRequest(id: string, status: "APPROVED" | "REJECTED") {
  const { session, schoolId } = await resolveTenantContext()
  await enforceModuleAccess("LEAVES")
  if (session.role !== Role.ADMIN && session.role !== Role.SUPERADMIN) {
    throw new Error("Unauthorized: Administrative privileges required.")
  }

  const existing = await prisma.leaveRequest.findUnique({
    where: { id },
    select: { id: true, schoolId: true, status: true },
  })

  if (!existing) {
    throw new Error("Leave request not found.")
  }

  if (session.role !== Role.SUPERADMIN && existing.schoolId !== schoolId) {
    throw new Error("Security Violation: Leave request belongs to another tenant.")
  }

  const newStatus = status === "APPROVED" ? LeaveStatus.APPROVED : LeaveStatus.REJECTED

  const updated = await prisma.leaveRequest.update({
    where: { id },
    data: {
      status: newStatus,
      reviewerId: session.userId,
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      reviewer: { select: { id: true, name: true } },
    },
  })

  revalidatePath("/admin/operations")
  return updated
}

// ============================================================
// ASSET MANAGEMENT & ASSIGNMENT STATE-MACHINE ACTIONS
// ============================================================

export async function createAsset(data: CreateAssetInput) {
  const { session, schoolId } = await resolveTenantContext(data.schoolId)
  await enforceModuleAccess("ASSETS")
  if (session.role !== Role.ADMIN && session.role !== Role.SUPERADMIN) {
    throw new Error("Unauthorized: Administrative privileges required.")
  }

  if (!schoolId) {
    throw new Error("School context required to register an asset.")
  }

  if (!data.name || data.name.trim().length === 0) {
    throw new Error("Asset name is required.")
  }

  const asset = await prisma.asset.create({
    data: {
      name: data.name.trim(),
      category: data.category,
      status: AssetStatus.AVAILABLE,
      identifier: data.identifier?.trim() || null,
      schoolId,
    },
  })

  revalidatePath("/admin/operations")
  return asset
}

export async function getAssets(overrideSchoolId?: string) {
  try {
    const { session, schoolId } = await resolveTenantContext(overrideSchoolId)
    if (session.role !== Role.ADMIN && session.role !== Role.SUPERADMIN) {
      return []
    }

    return await prisma.asset.findMany({
      where: schoolId ? { schoolId } : {},
      include: {
        assignedTo: { select: { id: true, name: true, email: true, role: true } },
      },
      orderBy: { createdAt: "desc" },
    })
  } catch (err) {
    return []
  }
}

export async function assignAsset(assetId: string, targetUserId: string) {
  const { session, schoolId } = await resolveTenantContext()
  await enforceModuleAccess("ASSETS")
  if (session.role !== Role.ADMIN && session.role !== Role.SUPERADMIN) {
    throw new Error("Unauthorized: Administrative privileges required.")
  }

  const asset = await prisma.asset.findUnique({
    where: { id: assetId },
    select: { id: true, schoolId: true },
  })

  if (!asset) {
    throw new Error("Asset not found.")
  }

  if (session.role !== Role.SUPERADMIN && asset.schoolId !== schoolId) {
    throw new Error("Security Violation: Asset belongs to another tenant.")
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, schoolId: true },
  })

  if (!targetUser) {
    throw new Error("Target user not found.")
  }

  if (session.role !== Role.SUPERADMIN && targetUser.schoolId !== schoolId) {
    throw new Error("Security Violation: Target user belongs to another tenant.")
  }

  const updatedAsset = await prisma.asset.update({
    where: { id: assetId },
    data: {
      status: AssetStatus.ASSIGNED,
      assignedToId: targetUserId,
    },
    include: {
      assignedTo: { select: { id: true, name: true, email: true, role: true } },
    },
  })

  revalidatePath("/admin/operations")
  return updatedAsset
}

export async function updateAssetStatus(
  assetId: string,
  status: "AVAILABLE" | "MAINTENANCE" | "LOST"
) {
  const { session, schoolId } = await resolveTenantContext()
  await enforceModuleAccess("ASSETS")
  if (session.role !== Role.ADMIN && session.role !== Role.SUPERADMIN) {
    throw new Error("Unauthorized: Administrative privileges required.")
  }

  const asset = await prisma.asset.findUnique({
    where: { id: assetId },
    select: { id: true, schoolId: true },
  })

  if (!asset) {
    throw new Error("Asset not found.")
  }

  if (session.role !== Role.SUPERADMIN && asset.schoolId !== schoolId) {
    throw new Error("Security Violation: Asset belongs to another tenant.")
  }

  const newStatus =
    status === "MAINTENANCE"
      ? AssetStatus.MAINTENANCE
      : status === "LOST"
      ? AssetStatus.LOST
      : AssetStatus.AVAILABLE

  const updatedAsset = await prisma.asset.update({
    where: { id: assetId },
    data: {
      status: newStatus,
      assignedToId: null,
    },
    include: {
      assignedTo: { select: { id: true, name: true, email: true, role: true } },
    },
  })

  revalidatePath("/admin/operations")
  return updatedAsset
}
