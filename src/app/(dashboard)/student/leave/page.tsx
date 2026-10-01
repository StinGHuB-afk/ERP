import { verifySession } from "@/lib/auth/session"
import { getLeaveRequests } from "@/app/actions/operations.actions"
import { TeacherLeaveClient } from "@/components/teacher/TeacherLeaveClient"
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

export default async function StudentLeavePage() {
  const session = await verifySession()
  if (!session || session.role !== "STUDENT") {
    redirect("/")
  }

  const leaveRequests = await getLeaveRequests()

  return (
    <div className="space-y-6">
      <TeacherLeaveClient leaveRequests={leaveRequests} />
    </div>
  )
}
