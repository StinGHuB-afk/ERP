"use server"

import prisma from "@/lib/prisma"
import { verifySession } from "@/lib/auth/session"
import { DayOfWeek } from "@prisma/client"

export async function getStudentDashboardData() {
  const session = await verifySession()
  if (!session?.userId) {
    throw new Error("Unauthorized")
  }

  // Determine current day of week as Prisma DayOfWeek enum
  const days = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"]
  const currentDay = days[new Date().getDay()] as DayOfWeek

  const student = await prisma.student.findUnique({
    where: { userId: session.userId },
    include: {
      class: {
        include: {
          timetablePeriods: {
            where: { dayOfWeek: currentDay },
            orderBy: { startTime: "asc" },
            include: {
              subject: true,
              teacher: {
                include: {
                  user: true
                }
              }
            }
          }
        }
      }
    }
  })

  if (!student) {
    // Return gracefully for admins or superadmins with no linked student profile
    return { isStudentProfileLinked: false }
  }

  return {
    isStudentProfileLinked: true,
    student
  }
}
