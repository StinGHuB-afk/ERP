"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { reviewRiskFlag } from "@/app/actions/at-risk"
import { AlertTriangle, ShieldAlert, CheckCircle2, XCircle, Clock, UserCheck, FileText, Filter, Info } from "lucide-react"

interface RiskFlagItem {
  id: string
  studentId: string
  classId: string
  academicSessionId: string
  riskLevel: "HIGH" | "MODERATE" | "LOW"
  riskScore: number
  reasons: string
  ruleVersion: string
  status: "PENDING" | "ACKNOWLEDGED" | "DISMISSED"
  reviewNote: string | null
  reviewedAt: Date | string | null
  createdAt: Date | string
  student: { rollNumber: string | null; user: { name: string | null; email: string } | null }
  class: { name: string }
  reviewedBy: { name: string | null } | null
}

export default function AtRiskDashboardClient({ initialFlags }: { initialFlags: RiskFlagItem[]; targetClassId: string | null }) {
  const router = useRouter()
  const [flags, setFlags] = useState<RiskFlagItem[]>(initialFlags)
  const [filterStatus, setFilterStatus] = useState<"ALL" | "PENDING" | "ACKNOWLEDGED" | "DISMISSED">("ALL")
  const [selectedFlag, setSelectedFlag] = useState<RiskFlagItem | null>(null)
  const [reviewAction, setReviewAction] = useState<"ACKNOWLEDGED" | "DISMISSED">("ACKNOWLEDGED")
  const [note, setNote] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const filteredFlags = filterStatus === "ALL" ? flags : flags.filter((f) => f.status === filterStatus)

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFlag) return
    if (!note.trim() || note.trim().length < 3) {
      setErrorMessage("Please enter a review note (at least 3 characters).")
      return
    }

    setIsSubmitting(true)
    setErrorMessage(null)

    const result = await reviewRiskFlag({ flagId: selectedFlag.id, status: reviewAction, reviewNote: note.trim() })
    setIsSubmitting(false)

    if (result.error) {
      setErrorMessage(result.error)
      return
    }

    setSuccessMessage(`Flag for ${selectedFlag.student.user?.name || "Student"} updated to ${reviewAction}.`)
    setFlags((prev) =>
      prev.map((item) =>
        item.id === selectedFlag.id ? { ...item, status: reviewAction, reviewNote: note.trim(), reviewedAt: new Date().toISOString() } : item
      )
    )
    setSelectedFlag(null)
    setNote("")
    router.refresh()
    setTimeout(() => setSuccessMessage(null), 4000)
  }

  const parseReasons = (json: string): string[] => {
    try { return JSON.parse(json) } catch { return [json] }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 text-slate-800">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm relative overflow-hidden">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                Rule Engine AT_RISK_RULE_V1.0
              </span>
              <span className="text-xs text-slate-500">Read-Only Architecture</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-7 h-7 text-amber-500" /> At-Risk Student Review Dashboard
            </h1>
            <p className="text-slate-500 text-sm mt-1">Early intervention indicators aggregated transparently from attendance and mark data.</p>
          </div>
        </div>
      </div>

      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3 text-emerald-800 text-sm shadow-sm">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <StatCard title="Total Flags" value={flags.length} />
        <StatCard title="High Risk" value={flags.filter((f) => f.riskLevel === "HIGH").length} icon={<ShieldAlert className="w-4 h-4 text-red-600" />} color="border-red-200 text-red-700 bg-red-50/50" />
        <StatCard title="Pending Review" value={flags.filter((f) => f.status === "PENDING").length} icon={<Clock className="w-4 h-4 text-amber-600" />} color="border-amber-200 text-amber-700 bg-amber-50/50" />
        <StatCard title="Acknowledged" value={flags.filter((f) => f.status === "ACKNOWLEDGED").length} icon={<UserCheck className="w-4 h-4 text-emerald-600" />} color="border-emerald-200 text-emerald-700 bg-emerald-50/50" />
        <StatCard title="Dismissed (False Positives)" value={flags.filter((f) => f.status === "DISMISSED").length} icon={<XCircle className="w-4 h-4 text-slate-500" />} color="border-slate-200 text-slate-700 bg-slate-50/50" className="col-span-2 lg:col-span-1" />
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex items-center gap-1 sm:gap-2">
          <Filter className="w-4 h-4 text-slate-400 mr-1" />
          {(["ALL", "PENDING", "ACKNOWLEDGED", "DISMISSED"] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterStatus === status ? "bg-amber-500 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200"
              }`}
            >
              {status}
            </button>
          ))}
        </div>
        <div className="text-xs text-slate-500 hidden sm:block font-mono">Showing {filteredFlags.length} of {flags.length} records</div>
      </div>

      {/* Cards Grid */}
      {filteredFlags.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-900">No At-Risk Flags</h3>
          <p className="text-slate-500 text-sm mt-1">No student risk indicators match the selected filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredFlags.map((flag) => {
            const isHigh = flag.riskLevel === "HIGH"
            return (
              <div key={flag.id} className={`bg-white border rounded-2xl p-5 shadow-sm flex flex-col justify-between ${isHigh ? "border-red-200" : "border-amber-200"}`}>
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-lg text-slate-900">{flag.student.user?.name || "Unknown Student"}</h3>
                        <span className="text-xs font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">{flag.class.name}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">Roll: {flag.student.rollNumber || "N/A"} | Email: {flag.student.user?.email || "N/A"}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`text-xs font-bold uppercase px-2.5 py-1 rounded-full border ${isHigh ? "bg-red-50 text-red-700 border-red-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>
                        {flag.riskLevel} ({flag.riskScore} PTS)
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">{flag.status}</span>
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-4 space-y-2">
                    <div className="text-xs font-semibold text-slate-600 flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
                      <Info className="w-3.5 h-3.5 text-amber-500" /> Rule Engine Triggers ({flag.ruleVersion})
                    </div>
                    <ul className="space-y-1 text-xs">
                      {parseReasons(flag.reasons).map((reason, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-slate-700 font-mono"><span className="text-amber-500">•</span><span>{reason}</span></li>
                      ))}
                    </ul>
                  </div>

                  {flag.reviewNote && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs mb-4">
                      <div className="flex items-center justify-between text-slate-500 mb-1">
                        <span className="font-semibold text-slate-700 flex items-center gap-1"><FileText className="w-3.5 h-3.5 text-emerald-600" /> Staff Review Note</span>
                        <span className="text-[10px]">By: {flag.reviewedBy?.name || "Staff"}</span>
                      </div>
                      <p className="text-slate-600 italic">"{flag.reviewNote}"</p>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                  <button onClick={() => { setSelectedFlag(flag); setReviewAction("ACKNOWLEDGED"); setNote(flag.reviewNote || ""); setErrorMessage(null) }} className="flex-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold py-2 rounded-xl flex items-center justify-center gap-1.5 hover:bg-emerald-100 transition-colors">
                    <UserCheck className="w-3.5 h-3.5" /> Acknowledge
                  </button>
                  <button onClick={() => { setSelectedFlag(flag); setReviewAction("DISMISSED"); setNote(flag.reviewNote || ""); setErrorMessage(null) }} className="flex-1 bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold py-2 rounded-xl flex items-center justify-center gap-1.5 hover:bg-slate-200 transition-colors">
                    <XCircle className="w-3.5 h-3.5" /> Dismiss
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Review Modal */}
      {selectedFlag && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900">Staff Review: {selectedFlag.student.user?.name || "Student"} ({reviewAction})</h3>
              <button onClick={() => setSelectedFlag(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            {errorMessage && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700">{errorMessage}</div>}
            <form onSubmit={handleReviewSubmit} className="space-y-4">
              <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Enter review note / rationale..." rows={4} className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500" required />
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setSelectedFlag(null)} className="bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-semibold px-4 py-2 rounded-xl transition-colors">Cancel</button>
                <button type="submit" disabled={isSubmitting} className={`text-xs font-semibold px-5 py-2 rounded-xl text-white transition-colors ${reviewAction === "ACKNOWLEDGED" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-amber-600 hover:bg-amber-700"}`}>{isSubmitting ? "Saving..." : `Confirm ${reviewAction}`}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ title, value, icon, color = "text-slate-900", className = "" }: { title: string; value: number; icon?: React.ReactNode; color?: string; className?: string }) {
  return (
    <div className={`bg-white border border-slate-200 rounded-xl p-4 shadow-sm ${className}`}>
      <div className={`text-xs font-medium flex items-center justify-between ${color}`}>
        <span>{title}</span>
        {icon}
      </div>
      <div className={`text-2xl font-bold mt-1 ${color}`}>{value}</div>
    </div>
  )
}
