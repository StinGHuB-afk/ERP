import { verifySession } from "@/lib/auth/session"
import { getLeaveRequests } from "@/app/actions/operations.actions"
import { TeacherLeaveClient } from "@/components/teacher/TeacherLeaveClient"
import { redirect } from "next/navigation"
import { getTenantModules } from "@/app/actions/entitlements.actions"

export const dynamic = "force-dynamic"

export default async function TeacherLeavePage() {
  const session = await verifySession()
  if (!session || (session.role !== "TEACHER" && session.role !== "ADMIN" && session.role !== "SUPERADMIN")) {
    redirect("/")
  }

  const modules = await getTenantModules()
  if (!modules["LEAVES"] && session.role === "TEACHER") {
    redirect("/teacher")
  }

  const leaveRequests = await getLeaveRequests()

  return <TeacherLeaveClient leaveRequests={leaveRequests} />
}
