import { verifySession } from "@/lib/auth/session"
import { redirect } from "next/navigation"
import { getAtRiskStudentsForTeacher } from "@/app/actions/at-risk"
import AtRiskDashboardClient from "./AtRiskDashboardClient"
import { AlertTriangle } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function AtRiskTeacherPage() {
  const session = await verifySession()

  if (!session || (session.role !== "TEACHER" && session.role !== "ADMIN")) {
    redirect("/login")
  }

  const response = await getAtRiskStudentsForTeacher()

  if (response.error || !response.success) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center shadow-xl">
          <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-slate-200 mb-2">Dashboard Unavailable</h2>
          <p className="text-slate-400 text-sm">
            {response.error || "Unable to load student risk indicators. Please verify class assignments."}
          </p>
        </div>
      </div>
    )
  }

  return (
    <AtRiskDashboardClient
      initialFlags={response.flags as any[]}
      targetClassId={response.targetClassId}
    />
  )
}
