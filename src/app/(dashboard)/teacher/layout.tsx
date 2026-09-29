import { redirect } from "next/navigation"
import { verifySession } from "@/lib/auth/session"
import prisma from "@/lib/prisma"

export default async function TeacherLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await verifySession()

  if (!session?.userId) {
    redirect('/login')
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: session.userId },
  })

  if (dbUser?.role !== "TEACHER" && dbUser?.role !== "ADMIN" && dbUser?.role !== "SUPERADMIN") {
    if (dbUser?.role === "STUDENT") redirect('/student')
    if (dbUser?.role === "PARENT") redirect('/parent')
    redirect('/login')
  }

  return <>{children}</>
}
