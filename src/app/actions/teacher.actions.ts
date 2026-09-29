"use server"

import prisma from "@/lib/prisma"
import { verifySession } from "@/lib/auth/session"
import { DayOfWeek } from "@prisma/client"

export async function getTeacherDashboardData() {
  const session = await verifySession()
  if (!session?.userId) {
    throw new Error("Unauthorized")
  }

  // Determine current day of week as Prisma DayOfWeek enum
  const days = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"]
  const currentDay = days[new Date().getDay()] as DayOfWeek

  const teacher = await prisma.teacher.findUnique({
    where: { userId: session.userId },
    include: {
      classes: true, // Classes where they are the homeroom teacher
      timetablePeriods: {
        where: { dayOfWeek: currentDay },
        include: {
          class: true,
          subject: true
        },
        orderBy: { startTime: "asc" }
      },
      assignments: {
        where: {
          submissions: {
            some: { status: "PENDING" }
          }
        }
      }
    }
  })

  if (!teacher) {
    return { isTeacherProfileLinked: false }
  }

  // Count pending tasks: e.g. pending assignment submissions
  const pendingTasksCount = teacher.assignments.length // simplify or query count

  return {
    isTeacherProfileLinked: true,
    teacher: {
      ...teacher,
      classesAssignedCount: teacher.classes.length,
      periodsTodayCount: teacher.timetablePeriods.length,
      pendingTasksCount: pendingTasksCount
    }
  }
}
