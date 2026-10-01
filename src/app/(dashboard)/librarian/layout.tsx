import { redirect } from "next/navigation"
import { verifySession } from "@/lib/auth/session"

export default async function LibrarianLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await verifySession()

  if (!session || !["LIBRARIAN", "ADMIN", "SUPERADMIN"].includes(session.role)) {
    redirect("/")
  }

  return <>{children}</>
}
