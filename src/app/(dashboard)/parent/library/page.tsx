import { verifySession, getEffectiveTenantId } from "@/lib/auth/session"
import { getBooks, getBorrowRecords } from "@/app/actions/library.actions"
import { LibraryOpacClient } from "@/components/library/LibraryOpacClient"
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

export default async function ParentLibraryPage() {
  const session = await verifySession()
  if (!session || session.role !== "PARENT") {
    redirect("/")
  }

  const effectiveTenantId = await getEffectiveTenantId()
  if (!effectiveTenantId) redirect("/")

  const books = await getBooks(effectiveTenantId)
  const myBorrowRecords = await getBorrowRecords(effectiveTenantId, session.userId)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">School Library Catalog</h1>
        <p className="text-sm text-slate-500">Explore available books in the school library.</p>
      </div>
      <LibraryOpacClient books={books} myBorrowRecords={myBorrowRecords} />
    </div>
  )
}
