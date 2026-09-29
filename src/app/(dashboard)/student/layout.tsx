import { redirect } from "next/navigation"
import { verifySession } from "@/lib/auth/session"
import prisma from "@/lib/prisma"

export default async function StudentLayout({
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

  if (dbUser?.role !== "STUDENT" && dbUser?.role !== "ADMIN" && dbUser?.role !== "SUPERADMIN") {
    if (dbUser?.role === "TEACHER") redirect('/teacher')
    if (dbUser?.role === "PARENT") redirect('/parent')
    redirect('/login')
  }

  return <>{children}</>
}
