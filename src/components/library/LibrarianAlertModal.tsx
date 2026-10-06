"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { sendLibraryOverdueAlerts } from "@/app/actions/library.actions"
import { createAlert } from "@/app/actions/alert"
import { AlertPriority } from "@prisma/client"
import { BellRing, Plus, Loader2, AlertCircle, ShieldAlert, CheckCircle2, Send } from "lucide-react"
import { toast } from "sonner"

interface LibrarianAlertModalProps {
  schoolId: string
  borrowRecords?: any[]
}

export function LibrarianAlertModal({ schoolId, borrowRecords = [] }: LibrarianAlertModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<"AUTOMATED_REMINDERS" | "CUSTOM_ALERT">("AUTOMATED_REMINDERS")
  const [isLoading, setIsLoading] = useState(false)
  const [fineRate, setFineRate] = useState<number>(10)
  const [error, setError] = useState("")
  const router = useRouter()

  // Custom alert form states
  const [targetType, setTargetType] = useState<string>("GLOBAL")
  const [customTitle, setCustomTitle] = useState("")
  const [customMessage, setCustomMessage] = useState("")
  const [customPriority, setCustomPriority] = useState<AlertPriority>("INFO")
  const [requiresAck, setRequiresAck] = useState(false)

  const activeBorrows = borrowRecords.filter((r: any) => r.status === "BORROWED")
  const overdueBorrows = activeBorrows.filter((r: any) => new Date(r.dueDate) < new Date())

  async function handleDispatchOverdueAlerts() {
    setIsLoading(true)
    setError("")
    try {
      const res = await sendLibraryOverdueAlerts(schoolId, fineRate)
      if (res.error) {
        toast.error(res.error)
        setError(res.error)
      } else {
        toast.success(res.message || "Library alerts dispatched successfully!")
        setIsOpen(false)
        router.refresh()
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to dispatch library alerts.")
      setError(err.message || "Failed to dispatch library alerts.")
    } finally {
      setIsLoading(false)
    }
  }

  async function handleCustomAlertSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!customTitle.trim() || !customMessage.trim()) {
      setError("Please fill out both title and message.")
      return
    }

    setIsLoading(true)
    setError("")

    try {
      const result = await createAlert({
        title: customTitle.trim(),
        message: customMessage.trim(),
        priority: customPriority,
        requiresAcknowledgement: requiresAck,
        targetPayload: {
          targetType: targetType as any
        }
      })

      if (result.error) {
        toast.error(result.error)
        setError(result.error)
      } else {
        toast.success("Library announcement published successfully!")
        setIsOpen(false)
        setCustomTitle("")
        setCustomMessage("")
        router.refresh()
      }
    } catch (err: any) {
      toast.error(err.message || "An error occurred while publishing alert.")
      setError(err.message || "An error occurred while publishing alert.")
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-sm transition-colors"
      >
        <BellRing className="h-4 w-4" />
        Library Alert Manager
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
              <BellRing className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Library & Circulation Alert Manager</h2>
              <p className="text-[11px] text-slate-500">Dispatch due date, fine warnings & circulation announcements.</p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
          >
            ✕
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-100 bg-slate-50/50 px-6 pt-3 gap-2">
          <button
            onClick={() => { setActiveTab("AUTOMATED_REMINDERS"); setError("") }}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all ${
              activeTab === "AUTOMATED_REMINDERS"
                ? "border-blue-600 text-blue-600 font-bold"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            1-Click Overdue & Fine Reminders
          </button>
          <button
            onClick={() => { setActiveTab("CUSTOM_ALERT"); setError("") }}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all ${
              activeTab === "CUSTOM_ALERT"
                ? "border-blue-600 text-blue-600 font-bold"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Custom Library Announcement
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs font-medium border border-red-100 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {activeTab === "AUTOMATED_REMINDERS" ? (
            <div className="space-y-4">
              <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-4 text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-amber-900">
                  <ShieldAlert className="h-4 w-4 text-amber-600" />
                  Automated Circulation Fine & Due Scanner
                </div>
                <p className="text-amber-800/90 leading-relaxed">
                  Scanning <span className="font-bold">{activeBorrows.length} active borrowed books</span> across the school. Found <span className="font-bold text-red-700">{overdueBorrows.length} overdue books</span>.
                </p>
                <p className="text-slate-600 text-[11px]">
                  Clicking dispatch will automatically compile personalized return notices for every borrower with book titles, exact due dates, days overdue, and calculated school fine policies.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Overdue Fine Rate per Day (₹)
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-600">₹</span>
                  <input
                    type="number"
                    value={fineRate}
                    onChange={(e) => setFineRate(Number(e.target.value) || 0)}
                    min="0"
                    step="1"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-900 focus:border-blue-500 focus:outline-none"
                    placeholder="10"
                    required
                  />
                  <span className="text-xs text-slate-500 whitespace-nowrap">/ day per book</span>
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-[11px] text-slate-600 space-y-1 font-mono">
                <div className="font-bold text-slate-800">Sample Notification Preview:</div>
                <div className="italic text-slate-500 bg-white p-2 rounded border border-slate-200">
                  "OVERDUE NOTICE: Your book 'NCERT Mathematics' was due on Oct 4. It is 3 days OVERDUE. An overdue fine of ₹{3 * fineRate} (₹{fineRate}/day) is imposed per school policy. Please return it immediately."
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDispatchOverdueAlerts}
                  disabled={isLoading}
                  className="px-5 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl flex items-center gap-2 transition-colors disabled:opacity-50"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Dispatch Overdue & Fine Alerts
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleCustomAlertSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Target Audience</label>
                <select
                  value={targetType}
                  onChange={(e) => setTargetType(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                >
                  <option value="GLOBAL">Entire School (Students, Teachers & Staff)</option>
                  <option value="ALL_STUDENTS">All Students</option>
                  <option value="ALL_TEACHERS">All Teachers</option>
                  <option value="SPECIFIC_STUDENTS">All Active Book Borrowers</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Announcement Title *</label>
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="e.g. New Academic Reference Books Arrived"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Detailed Message *</label>
                <textarea
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="Write clear instructions regarding library rules, timings, or new arrivals..."
                  rows={4}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Priority Level</label>
                  <select
                    value={customPriority}
                    onChange={(e) => setCustomPriority(e.target.value as AlertPriority)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="INFO">Info</option>
                    <option value="NOTICE">Notice</option>
                    <option value="WARNING">Warning</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>

                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={requiresAck}
                      onChange={(e) => setRequiresAck(e.target.checked)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                    />
                    Require Reader Ack
                  </label>
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl flex items-center gap-2 transition-colors disabled:opacity-50"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Publish Announcement
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
