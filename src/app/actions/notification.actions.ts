"use server"

import prisma from "@/lib/prisma"
import { verifySession } from "@/lib/auth/session"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { AlertPriority, Role } from "@prisma/client"

export async function getAdminAlerts() {
  const session = await verifySession()
  if (!session?.userId) {
    throw new Error("Unauthorized")
  }

  // Determine if the user is SUPERADMIN or ADMIN
  const isSuperAdmin = session.role === "SUPERADMIN"
  const isAdmin = session.role === "ADMIN"

  if (!isSuperAdmin && !isAdmin) {
    throw new Error("Unauthorized: Insufficient permissions")
  }

  // We fetch alerts from the database.
  // Since Alert does not have schoolId directly, we filter by creator's schoolId if ADMIN.
  // We also include the AlertRecipient record for the current user to know if it's read.
  const alerts = await prisma.alert.findMany({
    where: isSuperAdmin
      ? {} // SUPERADMIN sees all global system alerts
      : {
          // ADMIN sees alerts related to their school
          creator: {
            schoolId: session.schoolId
          }
        },
    orderBy: { createdAt: "desc" },
    include: {
      recipients: {
        where: { userId: session.userId }
      },
      creator: {
        select: { name: true, email: true }
      }
    }
  })

  // Map the results to a simplified format for the UI
  return alerts.map(alert => {
    const recipientRecord = alert.recipients[0]
    return {
      id: alert.id,
      title: alert.title,
      message: alert.message,
      type: alert.priority, // INFO, NOTICE, WARNING, URGENT
      isRead: !!recipientRecord?.readAt,
      createdAt: alert.createdAt,
      creatorName: alert.creator?.name || alert.creator?.email || "System"
    }
  })
}

export async function markAlertAsRead(alertId: string) {
  const session = await verifySession()
  if (!session?.userId) {
    throw new Error("Unauthorized")
  }

  // Ensure an AlertRecipient record exists and set readAt
  await prisma.alertRecipient.upsert({
    where: {
      alertId_userId: {
        alertId: alertId,
        userId: session.userId
      }
    },
    create: {
      alertId: alertId,
      userId: session.userId,
      readAt: new Date()
    },
    update: {
      readAt: new Date()
    }
  })

  revalidatePath('/admin/alerts')
}

export async function createBroadcastAlert(formData: FormData) {
  const session = await verifySession()
  if (!session?.userId) {
    throw new Error("Unauthorized")
  }

  const isSuperAdmin = session.role === "SUPERADMIN"
  const isAdmin = session.role === "ADMIN"

  if (!isSuperAdmin && !isAdmin) {
    throw new Error("Unauthorized: Insufficient permissions")
  }

  const title = formData.get("title") as string
  const message = formData.get("message") as string
  const priority = formData.get("priority") as AlertPriority
  const targetRole = formData.get("targetRole") as string

  if (!title || !message || !priority || !targetRole) {
    throw new Error("Missing required fields")
  }

  // Determine user query filter based on targetRole
  let userFilter: any = {
    isArchived: false
  }

  // Only scope by schoolId if it's not a SUPERADMIN (or if SUPERADMIN wants to broadcast locally)
  // For this context, standard behavior is scoping to session.schoolId
  if (session.schoolId) {
    userFilter.schoolId = session.schoolId
  }

  if (targetRole !== "ALL") {
    userFilter.role = targetRole as Role
  }

  const targetUsers = await prisma.user.findMany({
    where: userFilter,
    select: { id: true }
  })

  if (targetUsers.length === 0) {
    throw new Error("No users found for the selected audience")
  }

  await prisma.$transaction(async (tx) => {
    // 1. Create the core Alert record
    const alert = await tx.alert.create({
      data: {
        title,
        message,
        priority,
        targetType: targetRole,
        creatorId: session.userId,
      }
    })

    // 2. Bulk create AlertRecipient records
    const recipientsData = targetUsers.map(user => ({
      alertId: alert.id,
      userId: user.id
    }))

    await tx.alertRecipient.createMany({
      data: recipientsData
    })
  })

  revalidatePath('/admin/alerts')
  redirect('/admin/alerts')
}
