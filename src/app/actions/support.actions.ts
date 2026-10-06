"use server"

import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { Role, TicketPriority, TicketStatus } from "@prisma/client"
import { verifySession, getEffectiveTenantId } from "@/lib/auth/session"

async function resolveTenantContext() {
  const session = await verifySession()
  if (!session) {
    throw new Error("Unauthorized")
  }
  const effectiveTenantId = await getEffectiveTenantId()
  const schoolId = session.role === Role.SUPERADMIN ? (effectiveTenantId || null) : (session.schoolId || effectiveTenantId || null)

  if (session.role !== Role.SUPERADMIN && !schoolId) {
    throw new Error("Orphaned account: No school association found.")
  }

  return { session, schoolId }
}

export type CreateTicketInput = {
  category: string
  subject: string
  message: string
  targetRole: Role
  priority?: TicketPriority
  targetUserId?: string
}

export async function createSupportTicket(input: CreateTicketInput) {
  const { session, schoolId } = await resolveTenantContext()

  if (!input.subject.trim() || !input.message.trim()) {
    throw new Error("Subject and message are required.")
  }

  // If targeting SUPERADMIN, schoolId is null or stored for context
  const ticketSchoolId = input.targetRole === Role.SUPERADMIN ? schoolId : schoolId

  const ticket = await prisma.supportTicket.create({
    data: {
      schoolId: ticketSchoolId,
      senderId: session.userId,
      senderRole: session.role as Role,
      targetRole: input.targetRole,
      targetUserId: input.targetUserId || null,
      category: input.category || "General",
      subject: input.subject.trim(),
      message: input.message.trim(),
      priority: input.priority || TicketPriority.MEDIUM,
      status: TicketStatus.OPEN,
    },
  })

  // Log activity
  await prisma.activityLog.create({
    data: {
      userId: session.userId,
      actorId: session.userId,
      action: "CREATE_SUPPORT_TICKET",
      details: `Created support ticket: "${input.subject}" (${input.category}) for ${input.targetRole}`,
    },
  }).catch(() => {}) // non-blocking log

  revalidatePath("/admin/help")
  revalidatePath("/teacher/help")
  revalidatePath("/student/help")
  revalidatePath("/parent/help")
  revalidatePath("/librarian/help")
  revalidatePath("/superadmin/help")

  return { success: true, ticket }
}

export async function getSupportTickets(filters?: {
  scope?: "mine" | "incoming"
  status?: TicketStatus
  category?: string
}) {
  const { session, schoolId } = await resolveTenantContext()
  const scope = filters?.scope || "mine"

  let whereClause: any = {}

  if (scope === "mine") {
    whereClause = { senderId: session.userId }
  } else {
    // Incoming tickets
    if (session.role === Role.SUPERADMIN && !schoolId) {
      // Superadmin global desk sees all tickets targeted to SUPERADMIN
      whereClause = { targetRole: Role.SUPERADMIN }
    } else if (session.role === Role.SUPERADMIN && schoolId) {
      // Impersonating admin or superadmin
      whereClause = {
        OR: [
          { targetRole: Role.SUPERADMIN },
          { schoolId: schoolId, targetRole: Role.ADMIN },
        ],
      }
    } else if (session.role === Role.ADMIN) {
      // School admin sees tickets sent to ADMIN or general inquiries in their school
      whereClause = {
        schoolId: schoolId,
        OR: [
          { targetRole: Role.ADMIN },
          { senderRole: { in: [Role.TEACHER, Role.STUDENT, Role.PARENT, Role.LIBRARIAN] } },
        ],
      }
    } else if (session.role === Role.TEACHER) {
      // Teacher sees tickets targeted to TEACHER in their school (either directly to them or unassigned teacher queries)
      whereClause = {
        schoolId: schoolId,
        targetRole: Role.TEACHER,
        OR: [
          { targetUserId: session.userId },
          { targetUserId: null },
        ],
      }
    } else {
      whereClause = { senderId: session.userId }
    }
  }

  if (filters?.status) {
    whereClause.status = filters.status
  }

  if (filters?.category && filters.category !== "ALL") {
    whereClause.category = filters.category
  }

  const tickets = await prisma.supportTicket.findMany({
    where: whereClause,
    include: {
      sender: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
      respondedBy: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
      school: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return tickets
}

export async function respondToSupportTicket(
  ticketId: string,
  responseText: string,
  newStatus: TicketStatus = TicketStatus.RESOLVED
) {
  const { session, schoolId } = await resolveTenantContext()

  if (!responseText.trim()) {
    throw new Error("Response text cannot be empty.")
  }

  const ticket = await prisma.supportTicket.findUnique({
    where: { id: ticketId },
  })

  if (!ticket) {
    throw new Error("Ticket not found.")
  }

  // Tenant Security Check
  if (session.role !== Role.SUPERADMIN) {
    if (ticket.schoolId && ticket.schoolId !== schoolId) {
      throw new Error("Unauthorized access to ticket from another school.")
    }
  }

  const updated = await prisma.supportTicket.update({
    where: { id: ticketId },
    data: {
      response: responseText.trim(),
      respondedAt: new Date(),
      respondedById: session.userId,
      status: newStatus,
    },
  })

  // Log activity
  await prisma.activityLog.create({
    data: {
      userId: session.userId,
      actorId: session.userId,
      action: "RESPOND_SUPPORT_TICKET",
      details: `Responded to support ticket "${ticket.subject}" (Status: ${newStatus})`,
    },
  }).catch(() => {})

  revalidatePath("/admin/help")
  revalidatePath("/teacher/help")
  revalidatePath("/student/help")
  revalidatePath("/parent/help")
  revalidatePath("/librarian/help")
  revalidatePath("/superadmin/help")

  return { success: true, updated }
}

export async function getSupportOverviewStats() {
  const { session, schoolId } = await resolveTenantContext()

  let baseWhere: any = {}
  if (session.role === Role.SUPERADMIN && !schoolId) {
    baseWhere = {}
  } else if (schoolId) {
    baseWhere = { schoolId }
  } else {
    baseWhere = { senderId: session.userId }
  }

  const [total, open, inProgress, resolved] = await Promise.all([
    prisma.supportTicket.count({ where: baseWhere }),
    prisma.supportTicket.count({ where: { ...baseWhere, status: TicketStatus.OPEN } }),
    prisma.supportTicket.count({ where: { ...baseWhere, status: TicketStatus.IN_PROGRESS } }),
    prisma.supportTicket.count({ where: { ...baseWhere, status: TicketStatus.RESOLVED } }),
  ])

  return { total, open, inProgress, resolved }
}

export async function getTeachersForSupport() {
  const { session, schoolId } = await resolveTenantContext()
  if (!schoolId) return []

  const teachers = await prisma.teacher.findMany({
    where: { user: { schoolId } },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: { user: { name: "asc" } },
  })

  return teachers.map((t) => ({
    userId: t.user.id,
    teacherId: t.id,
    name: t.user.name || "Teacher",
    email: t.user.email,
  }))
}
