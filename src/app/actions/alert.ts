"use server"

import prisma from "@/lib/prisma"
import { verifySession } from "@/lib/auth/session"
import { resolveAndAuthorizeAlertTargets, assertAlertCreatorOrAdmin, AlertTargetPayload } from "@/lib/auth/alert-authorization"
import { requireActiveSessionId } from "@/lib/auth/teacher-authorization"
import { AlertPriority, AlertStatus, Role } from "@prisma/client"
import { revalidatePath } from "next/cache"

export type CreateAlertInput = {
  title: string
  message: string
  priority: AlertPriority
  requiresAcknowledgement: boolean
  expiresAt?: Date
  targetPayload: AlertTargetPayload
}

/**
 * Creates a new alert and snapshotted recipients.
 */
export async function createAlert(input: CreateAlertInput) {
  const session = await verifySession()
  if (!session) {
    return { error: "Not authenticated" }
  }

  const academicSessionId = await requireActiveSessionId()

  try {
    // 1. Resolve and Authorize Targets
    const targetUserIds = await resolveAndAuthorizeAlertTargets(
      session.userId,
      session.role as any, // Cast to Role Enum
      input.targetPayload,
      academicSessionId
    )

    if (targetUserIds.length === 0) {
      return { error: "No valid recipients found for the specified target." }
    }

    // 2. Atomic Transaction for Alert + Recipients
    await prisma.$transaction(async (tx) => {
      const alert = await tx.alert.create({
        data: {
          title: input.title,
          message: input.message,
          priority: input.priority,
          requiresAcknowledgement: input.requiresAcknowledgement,
          expiresAt: input.expiresAt,
          status: "PUBLISHED",
          publishedAt: new Date(),
          creatorId: session.userId,
          targetType: input.targetPayload.targetType,
        }
      })

      // Use createMany to insert explicitly resolved recipient snapshots
      const recipientData = targetUserIds.map(id => ({
        alertId: alert.id,
        userId: id
      }))

      await tx.alertRecipient.createMany({
        data: recipientData
      })
    })

    revalidatePath("/dashboard")
    revalidatePath("/admin/alerts")
    return { success: true }
  } catch (error: any) {
    console.error("Alert creation failed:", error)
    return { error: error.message || "An unexpected error occurred." }
  }
}

/**
 * Gets the current user's alerts.
 */
export async function getMyAlerts(filter: "ACTIVE" | "HISTORY" = "ACTIVE") {
  const session = await verifySession()
  if (!session) throw new Error("Not authenticated")

  const now = new Date()

  const whereClause: any = {
    userId: session.userId,
    alert: {
      status: { in: ["PUBLISHED", "ARCHIVED"] }
    }
  }

  if (filter === "ACTIVE") {
    whereClause.alert.status = "PUBLISHED"
    whereClause.alert.OR = [
      { expiresAt: null },
      { expiresAt: { gt: now } }
    ]
  }

  const recipients = await prisma.alertRecipient.findMany({
    where: whereClause,
    include: {
      alert: {
        include: {
          creator: { select: { name: true, role: true } }
        }
      }
    },
    orderBy: {
      alert: { createdAt: 'desc' }
    }
  })

  return recipients
}

/**
 * Fetches admin alerts list with aggregated metrics: totalTargets and acknowledgedCount.
 */
export async function getAdminAlerts() {
  const session = await verifySession()
  if (!session) throw new Error("Not authenticated")

  const alerts = await prisma.alert.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      creator: { select: { name: true, role: true } },
      recipients: {
        select: {
          id: true,
          userId: true,
          acknowledgedAt: true,
        },
      },
      acknowledgments: {
        select: {
          id: true,
          userId: true,
        },
      },
    },
  })

  return alerts.map((alert) => {
    const ackUserIds = new Set(
      alert.recipients
        .filter((r) => r.acknowledgedAt !== null)
        .map((r) => r.userId)
        .concat(alert.acknowledgments.map((a) => a.userId))
    )

    const totalTargets = alert.recipients.length
    const acknowledgedCount = ackUserIds.size

    return {
      ...alert,
      totalTargets,
      acknowledgedCount,
    }
  })
}

/**
 * Marks an alert as read by the current user.
 */
export async function markAlertRead(alertId: string) {
  const session = await verifySession()
  if (!session) throw new Error("Not authenticated")

  try {
    const recipient = await prisma.alertRecipient.findUnique({
      where: { alertId_userId: { alertId, userId: session.userId } },
      include: { alert: true }
    })

    if (!recipient) return { error: "Alert recipient record not found." }
    if (recipient.alert.status === "CANCELLED") return { error: "This alert has been cancelled." }

    await prisma.alertRecipient.update({
      where: {
        alertId_userId: { alertId, userId: session.userId }
      },
      data: {
        readAt: new Date()
      }
    })
    revalidatePath("/dashboard")
    return { success: true }
  } catch (error: any) {
    console.error("Failed to mark alert as read:", error)
    return { error: "Failed to update read status." }
  }
}

/**
 * Acknowledges an alert and records an AlertAcknowledgment record.
 */
export async function acknowledgeAlert(alertId: string) {
  const session = await verifySession()
  if (!session) throw new Error("Not authenticated")

  try {
    const recipient = await prisma.alertRecipient.findUnique({
      where: { alertId_userId: { alertId, userId: session.userId } },
      include: { alert: true }
    })

    if (!recipient) {
      return { error: "Alert recipient record not found." }
    }

    if (!recipient.alert.requiresAcknowledgement) {
      return { error: "This alert does not require acknowledgement." }
    }

    if (recipient.alert.status === "CANCELLED") {
      return { error: "This alert has been cancelled." }
    }

    const ackDate = new Date()

    await prisma.$transaction([
      prisma.alertRecipient.update({
        where: {
          alertId_userId: { alertId, userId: session.userId }
        },
        data: {
          acknowledgedAt: ackDate,
          readAt: recipient.readAt || ackDate
        }
      }),
      prisma.alertAcknowledgment.upsert({
        where: {
          alertId_userId: { alertId, userId: session.userId }
        },
        update: {
          acknowledgedAt: ackDate
        },
        create: {
          alertId,
          userId: session.userId,
          acknowledgedAt: ackDate
        }
      })
    ])

    revalidatePath("/dashboard")
    revalidatePath("/admin/alerts")
    return { success: true }
  } catch (error) {
    console.error("Failed to acknowledge alert:", error)
    return { error: "Failed to acknowledge alert." }
  }
}

/**
 * Fetches granular acknowledgment details for a specific alert, categorized by recipient roles.
 */
export async function getAlertAcknowledgmentDetails(alertId: string) {
  const session = await verifySession()
  if (!session) return { error: "Not authenticated" }

  try {
    const alert = await prisma.alert.findUnique({
      where: { id: alertId },
      include: {
        recipients: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              }
            }
          }
        },
        acknowledgments: true,
      }
    })

    if (!alert) return { error: "Alert not found." }

    const ackMap = new Map<string, Date>()
    alert.recipients.forEach((r) => {
      if (r.acknowledgedAt) ackMap.set(r.userId, r.acknowledgedAt)
    })
    alert.acknowledgments.forEach((a) => {
      if (!ackMap.has(a.userId)) ackMap.set(a.userId, a.acknowledgedAt)
    })

    const totalTargets = alert.recipients.length
    const acknowledgedCount = ackMap.size

    const rolesGroupMap: Record<string, {
      role: string
      total: number
      acknowledged: number
      users: Array<{
        id: string
        name: string
        email: string
        role: string
        acknowledged: boolean
        acknowledgedAt: Date | null
      }>
    }> = {}

    for (const r of alert.recipients) {
      const userRole = r.user.role || "USER"
      if (!rolesGroupMap[userRole]) {
        rolesGroupMap[userRole] = {
          role: userRole,
          total: 0,
          acknowledged: 0,
          users: []
        }
      }
      const isAck = ackMap.has(r.userId)
      rolesGroupMap[userRole].total += 1
      if (isAck) rolesGroupMap[userRole].acknowledged += 1

      rolesGroupMap[userRole].users.push({
        id: r.user.id,
        name: r.user.name || "Unknown User",
        email: r.user.email,
        role: userRole,
        acknowledged: isAck,
        acknowledgedAt: ackMap.get(r.userId) || null,
      })
    }

    return {
      success: true,
      details: {
        alertId: alert.id,
        title: alert.title,
        requiresAcknowledgement: alert.requiresAcknowledgement,
        totalTargets,
        acknowledgedCount,
        roles: Object.values(rolesGroupMap)
      }
    }
  } catch (error: any) {
    console.error("Failed to fetch alert acknowledgment details:", error)
    return { error: "Failed to fetch acknowledgment details." }
  }
}

/**
 * Updates the status of an alert. Only Creator or Admin can perform this.
 */
export async function updateAlertStatus(alertId: string, status: AlertStatus) {
  const session = await verifySession()
  if (!session) throw new Error("Not authenticated")

  try {
    await assertAlertCreatorOrAdmin(alertId, session.userId, session.role as Role)

    await prisma.alert.update({
      where: { id: alertId },
      data: { status }
    })

    revalidatePath("/dashboard")
    revalidatePath("/admin/alerts")
    return { success: true }
  } catch (error: any) {
    console.error("Failed to update alert status:", error)
    return { error: error.message || "Failed to update alert status." }
  }
}

export async function markAllAlertsAsRead() {
  const session = await verifySession()
  if (!session) return { error: "Not authenticated" }

  try {
    await prisma.alertRecipient.updateMany({
      where: {
        userId: session.userId,
        readAt: null
      },
      data: {
        readAt: new Date()
      }
    })
    revalidatePath("/parent/alerts")
    revalidatePath("/dashboard")
    return { success: true }
  } catch {
    return { error: "Failed to mark all alerts as read." }
  }
}
