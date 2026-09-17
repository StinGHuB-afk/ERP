"use client"

import { useState, useEffect, useTransition } from "react"
import { getAlertAcknowledgmentDetails } from "@/app/actions/alert"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Loader2, CheckCircle2, Clock, Users, ShieldAlert } from "lucide-react"

interface AlertAckModalProps {
  alertId: string | null
  isOpen: boolean
  onClose: () => void
}

interface UserDetail {
  id: string
  name: string
  email: string
  role: string
  acknowledged: boolean
  acknowledgedAt: Date | string | null
}

interface RoleGroup {
  role: string
  total: number
  acknowledged: number
  users: UserDetail[]
}

interface AckDetailsData {
  alertId: string
  title: string
  requiresAcknowledgement: boolean
  totalTargets: number
  acknowledgedCount: number
  roles: RoleGroup[]
}

export function AlertAckModal({ alertId, isOpen, onClose }: AlertAckModalProps) {
  const [data, setData] = useState<AckDetailsData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<string>("ALL")

  useEffect(() => {
    if (!isOpen || !alertId) {
      setData(null)
      setError(null)
      return
    }

    async function fetchDetails() {
      setLoading(true)
      setError(null)
      try {
        const res = await getAlertAcknowledgmentDetails(alertId!)
        if (res.error) {
          setError(res.error)
        } else if (res.details) {
          setData(res.details as AckDetailsData)
        }
      } catch (err: any) {
        setError(err.message || "Failed to load details.")
      } finally {
        setLoading(false)
      }
    }

    fetchDetails()
  }, [alertId, isOpen])

  if (!isOpen) return null

  const percentage = data && data.totalTargets > 0
    ? Math.round((data.acknowledgedCount / data.totalTargets) * 100)
    : 0

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl bg-white p-6 rounded-xl shadow-lg space-y-5 max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            <DialogTitle className="text-lg font-bold text-slate-900">
              Acknowledgment Tracking
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-slate-500">
            Real-time status of recipients who have acknowledged this alert.
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="py-12 text-center text-slate-500 flex flex-col items-center justify-center space-y-2">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            <span className="text-xs font-medium">Fetching recipient acknowledgment logs...</span>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-medium">
            {error}
          </div>
        )}

        {!loading && data && (
          <div className="space-y-6">
            {/* Header Metrics Banner */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 truncate max-w-sm">{data.title}</h4>
                  <p className="text-xs text-slate-500">
                    {data.acknowledgedCount} of {data.totalTargets} Recipients Acknowledged ({percentage}%)
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={
                    percentage === 100
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200 font-bold"
                      : "bg-blue-50 text-blue-700 border-blue-200 font-bold"
                  }
                >
                  {data.acknowledgedCount} / {data.totalTargets}
                </Badge>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all duration-300 rounded-full"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>

            {/* Role Filter Tabs */}
            <div className="flex items-center gap-1.5 border-b border-slate-200 pb-2 overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveTab("ALL")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  activeTab === "ALL"
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                All Roles ({data.totalTargets})
              </button>
              {data.roles.map((rg) => (
                <button
                  key={rg.role}
                  type="button"
                  onClick={() => setActiveTab(rg.role)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors capitalize ${
                    activeTab === rg.role
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {rg.role.toLowerCase()}s ({rg.acknowledged}/{rg.total})
                </button>
              ))}
            </div>

            {/* Granular User List */}
            <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1 divide-y divide-slate-100">
              {data.roles
                .filter((rg) => activeTab === "ALL" || activeTab === rg.role)
                .map((rg) => (
                  <div key={rg.role} className="pt-3 first:pt-0 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
                      <span>{rg.role}s</span>
                      <span>
                        {rg.acknowledged} / {rg.total} Acknowledged
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {rg.users.map((user) => (
                        <div
                          key={user.id}
                          className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 hover:bg-slate-50/80 transition-colors text-xs"
                        >
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-900">{user.name}</span>
                            <span className="text-[11px] text-slate-500">{user.email}</span>
                          </div>

                          {user.acknowledged ? (
                            <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 font-semibold">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                              <span>Acknowledged</span>
                              {user.acknowledgedAt && (
                                <span className="text-[10px] text-emerald-600 font-normal">
                                  ({new Date(user.acknowledgedAt).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })})
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200 font-medium">
                              <Clock className="h-3.5 w-3.5 text-slate-400" />
                              <span>Pending</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
