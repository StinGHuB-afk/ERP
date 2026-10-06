import { verifySession, getEffectiveTenantId } from "@/lib/auth/session"
import { getBooks, getBorrowRecords } from "@/app/actions/library.actions"
import { LibraryOpacClient } from "@/components/library/LibraryOpacClient"
import { redirect } from "next/navigation"
import { getTenantModules } from "@/app/actions/entitlements.actions"

export const dynamic = "force-dynamic"

export default async function TeacherLibraryPage() {
  const session = await verifySession()
  if (!session || session.role !== "TEACHER") {
    redirect("/")
  }

  const effectiveTenantId = await getEffectiveTenantId()
  if (!effectiveTenantId) redirect("/")

  const modules = await getTenantModules()
  if (!modules["LIBRARY"]) {
    redirect("/teacher")
  }

  const books = await getBooks(effectiveTenantId)
  const myBorrowRecords = await getBorrowRecords(effectiveTenantId, session.userId)

  return <LibraryOpacClient books={books} myBorrowRecords={myBorrowRecords} />
}
