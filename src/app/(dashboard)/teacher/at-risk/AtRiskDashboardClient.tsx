"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { reviewRiskFlag } from "@/app/actions/at-risk"
import {
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Clock,
  UserCheck,
  FileText,
  Filter,
  Info,
} from "lucide-react"

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
  student: {
    rollNumber: string | null
    user: {
      name: string | null
      email: string
    } | null
  }
  class: {
    name: string
  }
  reviewedBy: {
    name: string | null
  } | null
}

interface AtRiskDashboardClientProps {
  initialFlags: RiskFlagItem[]
  targetClassId: string | null
}

export default function AtRiskDashboardClient({
  initialFlags,
  targetClassId,
}: AtRiskDashboardClientProps) {
  const router = useRouter()
  const [flags, setFlags] = useState<RiskFlagItem[]>(initialFlags)
  const [filterStatus, setFilterStatus] = useState<"ALL" | "PENDING" | "ACKNOWLEDGED" | "DISMISSED">("ALL")
  const [selectedFlag, setSelectedFlag] = useState<RiskFlagItem | null>(null)
  const [reviewAction, setReviewAction] = useState<"ACKNOWLEDGED" | "DISMISSED">("ACKNOWLEDGED")
  const [note, setNote] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Stats calculation
  const totalCount = flags.length
  const highRiskCount = flags.filter((f) => f.riskLevel === "HIGH").length
  const pendingCount = flags.filter((f) => f.status === "PENDING").length
  const acknowledgedCount = flags.filter((f) => f.status === "ACKNOWLEDGED").length
  const dismissedCount = flags.filter((f) => f.status === "DISMISSED").length

  const filteredFlags = flags.filter((f) => {
    if (filterStatus === "ALL") return true
    return f.status === filterStatus
  })

  const handleOpenReviewModal = (flag: RiskFlagItem, action: "ACKNOWLEDGED" | "DISMISSED") => {
    setSelectedFlag(flag)
    setReviewAction(action)
    setNote(flag.reviewNote || "")
    setErrorMessage(null)
  }

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFlag) return

    if (!note.trim() || note.trim().length < 3) {
      setErrorMessage("Please enter a review note (at least 3 characters).")
      return
    }

    setIsSubmitting(true)
    setErrorMessage(null)

    const result = await reviewRiskFlag({
      flagId: selectedFlag.id,
      status: reviewAction,
      reviewNote: note.trim(),
    })

    setIsSubmitting(false)

    if (result.error) {
      setErrorMessage(result.error)
    } else {
      setSuccessMessage(
        `Flag for ${selectedFlag.student.user?.name || "Student"} successfully updated to ${reviewAction}.`
      )
      // Update local state optimistically
      setFlags((prev) =>
        prev.map((item) =>
          item.id === selectedFlag.id
            ? {
                ...item,
                status: reviewAction,
                reviewNote: note.trim(),
                reviewedAt: new Date().toISOString(),
              }
            : item
        )
      )
      setSelectedFlag(null)
      setNote("")
      router.refresh()

      setTimeout(() => setSuccessMessage(null), 4000)
    }
  }

  const parseReasons = (reasonsJson: string): string[] => {
    try {
      return JSON.parse(reasonsJson)
    } catch {
      return [reasonsJson]
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 text-slate-100">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                Rule Engine AT_RISK_RULE_V1.0
              </span>
              <span className="text-xs text-slate-400">Read-Only Architecture</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
              <AlertTriangle className="w-7 h-7 text-amber-400" />
              At-Risk Student Review Dashboard
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Early intervention indicators aggregated transparently from attendance and academic assessment data.
            </p>
          </div>
        </div>
      </div>

      {/* Alert Messages */}
      {successMessage && (
        <div className="bg-emerald-950/50 border border-emerald-500/30 rounded-xl p-4 flex items-center gap-3 text-emerald-300 text-sm">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="text-xs text-slate-400 font-medium">Total Flags</div>
          <div className="text-2xl font-bold text-slate-100 mt-1">{totalCount}</div>
        </div>

        <div className="bg-slate-900 border border-red-500/30 rounded-xl p-4 shadow-sm">
          <div className="text-xs text-red-400 font-medium flex items-center justify-between">
            <span>High Risk</span>
            <ShieldAlert className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-2xl font-bold text-red-400 mt-1">{highRiskCount}</div>
        </div>

        <div className="bg-slate-900 border border-amber-500/30 rounded-xl p-4 shadow-sm">
          <div className="text-xs text-amber-400 font-medium flex items-center justify-between">
            <span>Pending Review</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400 mt-1">{pendingCount}</div>
        </div>

        <div className="bg-slate-900 border border-emerald-500/30 rounded-xl p-4 shadow-sm">
          <div className="text-xs text-emerald-400 font-medium flex items-center justify-between">
            <span>Acknowledged</span>
            <UserCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">{acknowledgedCount}</div>
        </div>

        <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 shadow-sm col-span-2 lg:col-span-1">
          <div className="text-xs text-slate-400 font-medium flex items-center justify-between">
            <span>Dismissed (False Positives)</span>
            <XCircle className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-300 mt-1">{dismissedCount}</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-1 sm:gap-2">
          <Filter className="w-4 h-4 text-slate-400 mr-1" />
          {(["ALL", "PENDING", "ACKNOWLEDGED", "DISMISSED"] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterStatus === status
                  ? "bg-amber-500 text-slate-950 shadow-md"
                  : "bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        <div className="text-xs text-slate-400 hidden sm:block font-mono">
          Showing {filteredFlags.length} of {totalCount} records
        </div>
      </div>

      {/* Risk Flag Cards Grid */}
      {filteredFlags.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
          <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-200">No At-Risk Flags</h3>
          <p className="text-slate-400 text-sm mt-1">
            No student risk indicators match the selected filter query.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredFlags.map((flag) => {
            const reasonsList = parseReasons(flag.reasons)
            const isHighRisk = flag.riskLevel === "HIGH"

            return (
              <div
                key={flag.id}
                className={`bg-slate-900 border rounded-2xl p-5 shadow-lg flex flex-col justify-between transition-all ${
                  isHighRisk
                    ? "border-red-500/40 hover:border-red-500/70"
                    : "border-amber-500/30 hover:border-amber-500/60"
                }`}
              >
                <div>
                  {/* Top Bar */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-lg text-white">
                          {flag.student.user?.name || "Unknown Student"}
                        </h3>
                        <span className="text-xs font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                          {flag.class.name}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Roll Number: {flag.student.rollNumber || "N/A"} | Email: {flag.student.user?.email || "N/A"}
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <span
                        className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                          isHighRisk
                            ? "bg-red-500/10 text-red-400 border-red-500/30"
                            : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                        }`}
                      >
                        {flag.riskLevel} RISK ({flag.riskScore} PTS)
                      </span>

                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                          flag.status === "PENDING"
                            ? "bg-amber-950/60 text-amber-300 border border-amber-800/50"
                            : flag.status === "ACKNOWLEDGED"
                            ? "bg-emerald-950/60 text-emerald-300 border border-emerald-800/50"
                            : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        {flag.status}
                      </span>
                    </div>
                  </div>

                  {/* Rule Triggers Breakdown */}
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 mb-4 space-y-2">
                    <div className="text-xs font-semibold text-slate-400 flex items-center justify-between border-b border-slate-800 pb-1.5">
                      <span className="flex items-center gap-1.5">
                        <Info className="w-3.5 h-3.5 text-amber-400" />
                        Rule Engine Triggers ({flag.ruleVersion})
                      </span>
                    </div>
                    <ul className="space-y-1.5 text-xs">
                      {reasonsList.map((reason, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-slate-300 font-mono">
                          <span className="text-amber-400 font-bold">•</span>
                          <span>{reason}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Review Attributions (If reviewed) */}
                  {flag.reviewNote && (
                    <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 text-xs mb-4">
                      <div className="flex items-center justify-between text-slate-400 mb-1">
                        <span className="font-semibold text-slate-300 flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5 text-emerald-400" />
                          Staff Review Note
                        </span>
                        <span className="text-[10px]">
                          By: {flag.reviewedBy?.name || "Staff"} on{" "}
                          {flag.reviewedAt ? new Date(flag.reviewedAt).toLocaleDateString() : "N/A"}
                        </span>
                      </div>
                      <p className="text-slate-300 italic">"{flag.reviewNote}"</p>
                    </div>
                  )}
                </div>

                {/* Actions Bar */}
                <div className="flex items-center gap-2 pt-3 border-t border-slate-800">
                  <button
                    onClick={() => handleOpenReviewModal(flag, "ACKNOWLEDGED")}
                    className="flex-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    Acknowledge Flag
                  </button>

                  <button
                    onClick={() => handleOpenReviewModal(flag, "DISMISSED")}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Dismiss (False Positive)
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Review Modal Dialog */}
      {selectedFlag && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-start border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-white">
                  Staff Review: {selectedFlag.student.user?.name || "Student"}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Action: <span className="font-semibold text-amber-400">{reviewAction}</span>
                </p>
              </div>
              <button
                onClick={() => setSelectedFlag(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {errorMessage && (
              <div className="bg-red-950/50 border border-red-500/40 rounded-xl p-3 text-xs text-red-300">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleReviewSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Review Note / Rationale <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g., Student has an approved medical absence for 2 weeks from Sept 1st to 15th."
                  rows={4}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-all"
                  required
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  This note and your user attribution will be logged for administrative compliance.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedFlag(null)}
                  className="bg-slate-800 text-slate-300 text-xs font-semibold px-4 py-2 rounded-xl hover:bg-slate-700 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`text-xs font-semibold px-5 py-2 rounded-xl transition-all text-slate-950 ${
                    reviewAction === "ACKNOWLEDGED"
                      ? "bg-emerald-400 hover:bg-emerald-300"
                      : "bg-amber-400 hover:bg-amber-300"
                  } ${isSubmitting ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {isSubmitting ? "Saving..." : `Confirm ${reviewAction}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
