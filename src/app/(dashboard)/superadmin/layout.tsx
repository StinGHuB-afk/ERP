import { redirect } from "next/navigation"
import { verifySession } from "@/lib/auth/session"
import { Role } from "@prisma/client"

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await verifySession()

  if (!session || session.role !== Role.SUPERADMIN) {
    redirect("/login")
  }

  return <>{children}</>
}
