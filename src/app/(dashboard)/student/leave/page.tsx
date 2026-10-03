import { verifySession } from "@/lib/auth/session"
import { getLeaveRequests } from "@/app/actions/operations.actions"
import { TeacherLeaveClient } from "@/components/teacher/TeacherLeaveClient"
import { redirect } from "next/navigation"
import { getTenantModules } from "@/app/actions/entitlements.actions"
import { LockedModuleTeaser } from "@/components/ui/locked-module-teaser"

export const dynamic = "force-dynamic"

export default async function StudentLeavePage() {
  const session = await verifySession()
  if (!session || session.role !== "STUDENT") {
    redirect("/")
  }

  const modules = await getTenantModules()
  if (!modules["LEAVES"]) {
    return <LockedModuleTeaser moduleName="Leave Management" />
  }

  const leaveRequests = await getLeaveRequests()

  return (
    <div className="space-y-6">
      <TeacherLeaveClient leaveRequests={leaveRequests} />
    </div>
  )
}
