"use server"

import { redirect } from "next/navigation"
import prisma from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { verifySession, createSession } from "@/lib/auth/session"
import { Role } from "@prisma/client"

export async function changePassword(formData: FormData) {
  const password = formData.get("password") as string
  const confirmPassword = formData.get("confirmPassword") as string

  if (!password || password.length < 8) {
    return { error: "Password must be at least 8 characters." }
  }

  if (password !== confirmPassword) {
    return { error: "Passwords do not match." }
  }

  const session = await verifySession(true)
  if (!session?.userId) {
    return { error: "Unauthorized access. Please log in again." }
  }

  const user = await prisma.user.findUnique({ where: { id: session.userId } })
  if (!user) {
    return { error: "User not found." }
  }

  const isSamePassword = await bcrypt.compare(password, user.password)
  if (isSamePassword) {
    return { error: "You cannot reuse the default password. Please choose a new, secure password." }
  }

  const hashedPassword = await bcrypt.hash(password, 10)

  await prisma.user.update({
    where: { id: session.userId },
    data: {
      password: hashedPassword,
      mustChangePassword: false,
    },
  })

  await createSession(session.userId, session.role, false, session.schoolId)

  if (session.role === Role.SUPERADMIN) redirect("/superadmin")
  if (session.role === Role.ADMIN) redirect("/admin")
  if (session.role === Role.TEACHER) redirect("/teacher")
  if (session.role === Role.STUDENT) redirect("/student")
  if (session.role === Role.PARENT) redirect("/parent")

  redirect("/")
}
