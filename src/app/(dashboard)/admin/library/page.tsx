import { verifySession, getEffectiveTenantId } from "@/lib/auth/session"
import { getBooks, getBorrowRecords } from "@/app/actions/library.actions"
import { LibrarianDashboardClient } from "@/components/library/LibrarianDashboardClient"
import { redirect } from "next/navigation"
import { getTenantModules } from "@/app/actions/entitlements.actions"
import { LockedModuleTeaser } from "@/components/ui/locked-module-teaser"

export const dynamic = "force-dynamic"

export default async function AdminLibraryPage() {
  const session = await verifySession()
  if (!session || !["ADMIN", "SUPERADMIN"].includes(session.role)) {
    redirect("/")
  }

  const effectiveTenantId = await getEffectiveTenantId()
  if (!effectiveTenantId) {
    return <div className="p-4">Please select a school first.</div>
  }

  const modules = await getTenantModules()
  if (!modules["LIBRARY"]) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Library Management</h1>
          <p className="text-sm text-slate-500">Manage catalog, issue books, and view circulation records.</p>
        </div>
        <LockedModuleTeaser moduleName="Library & Circulation Management" />
      </div>
    )
  }

  const books = await getBooks(effectiveTenantId)
  const borrowRecords = await getBorrowRecords(effectiveTenantId)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Library Management</h1>
        <p className="text-sm text-slate-500">Manage catalog, issue books, and view circulation records.</p>
      </div>
      <LibrarianDashboardClient 
        books={books} 
        borrowRecords={borrowRecords} 
        schoolId={effectiveTenantId}
      />
    </div>
  )
}
