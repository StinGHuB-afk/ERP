import { verifySession, getEffectiveTenantId } from "@/lib/auth/session"
import { getBooks, getBorrowRecords } from "@/app/actions/library.actions"
import { LibrarianDashboardClient } from "@/components/library/LibrarianDashboardClient"
import { redirect } from "next/navigation"
import { getTenantModules } from "@/app/actions/entitlements.actions"
import { LockedModuleTeaser } from "@/components/ui/locked-module-teaser"

export const dynamic = "force-dynamic"

export default async function LibrarianDashboardPage() {
  const session = await verifySession()
  if (!session || !["LIBRARIAN", "ADMIN", "SUPERADMIN"].includes(session.role)) {
    redirect("/")
  }

  const effectiveTenantId = await getEffectiveTenantId()
  if (!effectiveTenantId) {
    return <div>Please select a school first.</div>
  }

  const modules = await getTenantModules()
  if (!modules["LIBRARY"]) {
    if (!["ADMIN", "SUPERADMIN"].includes(session.role)) {
      redirect("/")
    }
    return <LockedModuleTeaser moduleName="Library & Circulation Management" />
  }

  const books = await getBooks(effectiveTenantId)
  const borrowRecords = await getBorrowRecords(effectiveTenantId)

  return (
    <LibrarianDashboardClient 
      books={books} 
      borrowRecords={borrowRecords} 
      schoolId={effectiveTenantId}
    />
  )
}
