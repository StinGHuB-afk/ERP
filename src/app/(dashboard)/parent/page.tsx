import { verifySession } from "@/lib/auth/session"
import { redirect } from "next/navigation"
import { getParentChildren } from "@/app/actions/parent"
import ParentDashboardClient from "./ParentDashboardClient"
import { Users } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function ParentPortalPage() {
  const session = await verifySession()

  if (!session || session.role !== "PARENT") {
    redirect("/login")
  }

  const response = await getParentChildren()

  if (response.error || !response.success) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-xl p-6 text-center shadow-sm">
          <Users className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Portal Unavailable</h2>
          <p className="text-slate-500 text-sm">
            {response.error || "Unable to load linked student records. Please contact administration."}
          </p>
        </div>
      </div>
    )
  }

  return <ParentDashboardClient childrenList={response.children || []} />
}
