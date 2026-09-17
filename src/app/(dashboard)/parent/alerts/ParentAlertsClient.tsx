"use client"

import { useState, useTransition } from "react"
import { Bell, CheckCircle2, AlertTriangle, Info, ShieldAlert, Check, Loader2, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { markAlertRead, markAllAlertsAsRead } from "@/app/actions/alert"
import { toast } from "sonner"

export interface AlertItem {
  id: string
  alertId: string
  readAt: Date | string | null
  acknowledgedAt: Date | string | null
  createdAt: Date | string
  alert: {
    id: string
    title: string
    message: string
    priority: "INFO" | "NOTICE" | "WARNING" | "URGENT"
    status: string
    requiresAcknowledgement: boolean
    publishedAt: Date | string | null
    creator: {
      name: string | null
      role: string
    }
  }
}

export default function ParentAlertsClient({ alerts: initialAlerts }: { alerts: AlertItem[] }) {
  const [alerts, setAlerts] = useState<AlertItem[]>(initialAlerts)
  const [isPending, startTransition] = useTransition()

  const unreadCount = alerts.filter((item) => !item.readAt).length

  const handleMarkAllRead = () => {
    if (unreadCount === 0) return

    startTransition(async () => {
      const res = await markAllAlertsAsRead()
      if (res.error) {
        toast.error(res.error)
        return
      }
      setAlerts((prev) => prev.map((item) => ({ ...item, readAt: new Date().toISOString() })))
      toast.success("All notifications marked as read.")
    })
  }

  const handleMarkRead = (alertId: string) => {
    startTransition(async () => {
      const res = await markAlertRead(alertId)
      if (res.error) {
        toast.error(res.error)
        return
      }
      setAlerts((prev) =>
        prev.map((item) => (item.alertId === alertId ? { ...item, readAt: new Date().toISOString() } : item))
      )
      toast.success("Notification marked as read")
    })
  }

  if (alerts.length === 0) {
    return (
      <div className="space-y-6 max-w-4xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-sm">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Notifications & Alerts</h1>
              <p className="text-slate-500 text-xs mt-0.5">Important updates and school announcements for your child.</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-100 shadow-sm">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">You're all caught up!</h2>
          <p className="text-slate-500 text-sm mt-1 max-w-md mx-auto">
            There are no active notifications or announcements for your account right now. Check back later for updates.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-sm">
            <Bell className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Notifications & Alerts</h1>
              {unreadCount > 0 && (
                <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100 border-none font-semibold">
                  {unreadCount} New
                </Badge>
              )}
            </div>
            <p className="text-slate-500 text-xs mt-0.5">Important updates and school announcements for your child.</p>
          </div>
        </div>

        {unreadCount > 0 && (
          <Button
            onClick={handleMarkAllRead}
            disabled={isPending}
            variant="outline"
            className="active:scale-[0.98] transition-transform duration-100 text-xs font-medium border-slate-300 hover:bg-slate-100"
          >
            {isPending ? (
              <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin text-slate-500" />
            ) : (
              <Check className="w-3.5 h-3.5 mr-2 text-indigo-600" />
            )}
            Mark all as read
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {alerts.map((item) => {
          const isUnread = !item.readAt
          const priority = item.alert.priority

          return (
            <div
              key={item.id}
              className={`rounded-xl transition-all duration-200 p-5 ${
                isUnread
                  ? "bg-white border border-slate-200 border-l-4 border-l-indigo-600 shadow-sm ring-1 ring-indigo-500/10"
                  : "bg-slate-50/80 border border-slate-200 text-slate-600"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {priority === "URGENT" && <ShieldAlert className="w-5 h-5 text-red-500" />}
                    {priority === "WARNING" && <AlertTriangle className="w-5 h-5 text-amber-500" />}
                    {priority === "NOTICE" && <Info className="w-5 h-5 text-indigo-500" />}
                    {priority === "INFO" && <Sparkles className="w-5 h-5 text-slate-400" />}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3
                        className={`text-sm tracking-tight ${
                          isUnread ? "font-bold text-slate-900" : "font-medium text-slate-700"
                        }`}
                      >
                        {item.alert.title}
                      </h3>

                      {priority === "URGENT" && (
                        <Badge variant="destructive" className="text-[10px] uppercase font-bold py-0 h-4">
                          Urgent
                        </Badge>
                      )}
                      {priority === "WARNING" && (
                        <Badge className="bg-amber-100 text-amber-800 border-none text-[10px] uppercase font-semibold py-0 h-4">
                          Warning
                        </Badge>
                      )}
                      {isUnread && (
                        <span className="inline-block w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
                      )}
                    </div>

                    <p className="text-xs text-slate-600 mt-2 leading-relaxed whitespace-pre-wrap">
                      {item.alert.message}
                    </p>

                    <div className="flex items-center gap-4 mt-3 text-[11px] text-slate-400">
                      <span>From: {item.alert.creator?.name || "School Administration"}</span>
                      <span>•</span>
                      <span>
                        {new Date(item.alert.publishedAt || item.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                {isUnread && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleMarkRead(item.alertId)}
                    disabled={isPending}
                    className="text-xs text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 active:scale-[0.98] transition-transform duration-100"
                  >
                    Mark as read
                  </Button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
