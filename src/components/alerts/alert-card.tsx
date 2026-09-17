"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Clock, ShieldAlert, CheckCircle2, BarChart2 } from "lucide-react"
import { AlertAckModal } from "./alert-ack-modal"

export interface AlertCardData {
  id: string
  title: string
  message: string
  priority: string
  status: string
  targetType: string
  requiresAcknowledgement: boolean
  createdAt: Date | string
  creator: { name: string | null }
  totalTargets?: number
  acknowledgedCount?: number
}

interface AlertCardProps {
  alert: AlertCardData
  showStats?: boolean
}

export function AlertCard({ alert, showStats = true }: AlertCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  const total = alert.totalTargets ?? 0
  const ack = alert.acknowledgedCount ?? 0
  const percentage = total > 0 ? Math.round((ack / total) * 100) : 0

  return (
    <>
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs p-6 relative overflow-hidden transition-all hover:border-slate-300 hover:shadow-sm">
        {/* Priority Indicator Stripe */}
        {alert.priority === "URGENT" && <div className="absolute top-0 left-0 w-1 h-full bg-rose-600" />}
        {alert.priority === "WARNING" && <div className="absolute top-0 left-0 w-1 h-full bg-amber-500" />}
        {alert.priority === "NOTICE" && <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />}
        {alert.priority === "INFO" && <div className="absolute top-0 left-0 w-1 h-full bg-slate-300" />}

        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h3 className="font-bold text-base text-slate-900">{alert.title}</h3>
            <Badge
              variant={
                alert.status === "PUBLISHED"
                  ? "default"
                  : alert.status === "CANCELLED"
                  ? "destructive"
                  : "secondary"
              }
              className="text-[11px]"
            >
              {alert.status}
            </Badge>
            <Badge variant="outline" className="bg-slate-50 text-slate-600 text-[11px]">
              Target: {alert.targetType}
            </Badge>
            {alert.requiresAcknowledgement && (
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 gap-1 text-[11px]">
                <ShieldAlert className="h-3 w-3" />
                Requires Ack
              </Badge>
            )}
          </div>
        </div>

        <p className="text-slate-700 whitespace-pre-wrap text-xs leading-relaxed">{alert.message}</p>

        {/* Footer Info & Acknowledgment Progress Bar */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-4 text-xs font-medium text-slate-500 border-t border-slate-100 pt-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1.5 text-slate-500">
              <Clock className="h-3.5 w-3.5" />
              {new Date(alert.createdAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
            <div>Created by: <span className="text-slate-800 font-semibold">{alert.creator.name || "Admin"}</span></div>
          </div>

          {/* Visual Indicator Progress Badge */}
          {showStats && total > 0 && (
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              title="Click to view granular acknowledgment status"
              className="flex items-center gap-3 px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors group cursor-pointer"
            >
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                <BarChart2 className="h-3.5 w-3.5 text-blue-600 group-hover:scale-110 transition-transform" />
                <span>{ack} / {total} Acknowledged</span>
              </div>

              {/* Progress bar */}
              <div className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all duration-300 rounded-full"
                  style={{ width: `${percentage}%` }}
                />
              </div>

              <span className="text-[11px] text-slate-400 group-hover:text-blue-600 font-medium">Details →</span>
            </button>
          )}
        </div>
      </div>

      {/* Details Modal */}
      <AlertAckModal
        alertId={alert.id}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  )
}
