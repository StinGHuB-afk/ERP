import { getAdminAlerts } from "@/app/actions/alert"
import { BellRing } from "lucide-react"
import { CreateAlertForm } from "@/components/dashboard/create-alert-form"
import { AlertCard } from "@/components/alerts/alert-card"

export default async function AdminAlertsPage() {
  const alerts = await getAdminAlerts()

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 text-white rounded-lg shadow-sm">
            <BellRing className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Alerts & Notifications</h1>
            <p className="text-slate-500 text-sm">Targeted priority notifications for specific users and classes.</p>
          </div>
        </div>
        <CreateAlertForm isAdmin={true} />
      </div>

      <div className="space-y-4">
        {alerts.length === 0 ? (
          <div className="rounded-xl border bg-white p-12 text-center text-slate-500 shadow-sm flex flex-col items-center justify-center">
            <BellRing className="h-12 w-12 text-slate-300 mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-1">No alerts created</h3>
            <p className="text-xs text-slate-400 max-w-sm">
              Publish targeted priority alerts to specific roles or classes.
            </p>
          </div>
        ) : (
          alerts.map((alert) => (
            <AlertCard key={alert.id} alert={alert} showStats={true} />
          ))
        )}
      </div>
    </div>
  )
}
