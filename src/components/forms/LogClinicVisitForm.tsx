"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { logClinicVisit } from "@/app/actions/enterprise"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Stethoscope, Activity, AlertCircle, CheckCircle2, Loader2 } from "lucide-react"

interface LogClinicVisitFormProps {
  studentId: string
  studentName?: string
  triggerText?: string
  className?: string
}

export function LogClinicVisitForm({
  studentId,
  studentName = "Student",
  triggerText = "Log Clinic Visit",
  className = "",
}: LogClinicVisitFormProps) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const [reason, setReason] = useState("")
  const [symptoms, setSymptoms] = useState("")
  const [treatmentGiven, setTreatmentGiven] = useState("")
  const [medicationAdministered, setMedicationAdministered] = useState("")
  const [nurseNotes, setNurseNotes] = useState("")
  const [actionTaken, setActionTaken] = useState("")
  const [parentNotified, setParentNotified] = useState(false)

  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const router = useRouter()

  function resetForm() {
    setReason("")
    setSymptoms("")
    setTreatmentGiven("")
    setMedicationAdministered("")
    setNurseNotes("")
    setActionTaken("")
    setParentNotified(false)
    setError(null)
    setSuccessMsg(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!reason.trim()) {
      setError("Please specify the reason for the clinic visit.")
      return
    }

    setError(null)
    setSuccessMsg(null)

    startTransition(async () => {
      const res = await logClinicVisit({
        studentId,
        reason,
        symptoms: symptoms.trim() || undefined,
        treatmentGiven: treatmentGiven.trim() || undefined,
        medicationAdministered: medicationAdministered.trim() || undefined,
        nurseNotes: nurseNotes.trim() || undefined,
        actionTaken: actionTaken.trim() || undefined,
        parentNotified,
      })

      if (res.success) {
        setSuccessMsg("Clinic visit successfully logged!")
        setTimeout(() => {
          setOpen(false)
          resetForm()
          router.refresh()
        }, 1200)
      } else {
        setError(res.error || "Failed to log clinic visit.")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
      <DialogTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className={`gap-2 border-slate-200 text-slate-700 hover:bg-slate-50 bg-white ${className}`}
            suppressHydrationWarning
          >
            <Stethoscope className="h-4 w-4 text-emerald-600" />
            {triggerText}
          </Button>
        }
      />
      <DialogContent className="max-w-xl bg-white rounded-xl shadow-xl border border-slate-200 p-6 overflow-hidden">
        <DialogHeader className="border-b border-slate-100 pb-4 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900">
                Log Clinic Incident
              </DialogTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                Recording medical visit for <span className="font-semibold text-slate-800">{studentName}</span>
              </p>
            </div>
          </div>
        </DialogHeader>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 text-xs font-medium flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">
              Reason for Visit <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Headache, Minor Scrape, Fever check"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-800 placeholder-slate-400"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">Symptoms</label>
              <input
                type="text"
                placeholder="e.g. Temperature 100.2F, Nausea"
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-800 placeholder-slate-400"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">Treatment Given</label>
              <input
                type="text"
                placeholder="e.g. Rest in clinic 20 mins, Ice pack"
                value={treatmentGiven}
                onChange={(e) => setTreatmentGiven(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-800 placeholder-slate-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">Medication Administered</label>
              <input
                type="text"
                placeholder="e.g. Paracetamol 250mg (or None)"
                value={medicationAdministered}
                onChange={(e) => setMedicationAdministered(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-800 placeholder-slate-400"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">Follow-up Action Taken</label>
              <input
                type="text"
                placeholder="e.g. Returned to class, Sent home"
                value={actionTaken}
                onChange={(e) => setActionTaken(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-800 placeholder-slate-400"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">Nurse / Attendant Notes</label>
            <textarea
              rows={2}
              placeholder="Additional observations or notes..."
              value={nurseNotes}
              onChange={(e) => setNurseNotes(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-800 placeholder-slate-400 resize-none"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="parentNotified"
              checked={parentNotified}
              onChange={(e) => setParentNotified(e.target.checked)}
              className="h-4 w-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
            />
            <label htmlFor="parentNotified" className="text-xs font-semibold text-slate-700 cursor-pointer">
              Parent Notified (Phone call or email alert dispatched)
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
              className="text-xs border-slate-200"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs gap-2"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Logging Incident...
                </>
              ) : (
                <>
                  <Activity className="h-3.5 w-3.5" />
                  Save Clinic Visit
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
