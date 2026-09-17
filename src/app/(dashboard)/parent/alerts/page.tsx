import { verifySession } from "@/lib/auth/session"
import { redirect } from "next/navigation"
import { getMyAlerts } from "@/app/actions/alert"
import ParentAlertsClient, { AlertItem } from "./ParentAlertsClient"

export const dynamic = "force-dynamic"

export default async function ParentAlertsPage() {
  const session = await verifySession()

  if (!session || session.role !== "PARENT") {
    redirect("/login")
  }

  let alerts: AlertItem[] = []
  try {
    const rawAlerts = await getMyAlerts("HISTORY")
    alerts = JSON.parse(JSON.stringify(rawAlerts))
  } catch (error) {
    console.error("Failed to load parent alerts:", error)
  }

  return <ParentAlertsClient alerts={alerts} />
}
