"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { requestProfileUpdate } from "@/app/actions/enterprise"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { UserCheck, Edit3, AlertCircle, CheckCircle2, Loader2, Phone } from "lucide-react"

interface ProfileUpdateFormProps {
  studentId: string
  currentName?: string
  currentPhone?: string
  currentRelation?: string
  triggerText?: string
  className?: string
}

export function ProfileUpdateForm({
  studentId,
  currentName = "",
  currentPhone = "",
  currentRelation = "",
  triggerText = "Edit Emergency Contact",
  className = "",
}: ProfileUpdateFormProps) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const [emergencyContactName, setEmergencyContactName] = useState(currentName)
  const [emergencyContactPhone, setEmergencyContactPhone] = useState(currentPhone)
  const [emergencyContactRelation, setEmergencyContactRelation] = useState(currentRelation)

  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const router = useRouter()

  function resetForm() {
    setEmergencyContactName(currentName)
    setEmergencyContactPhone(currentPhone)
    setEmergencyContactRelation(currentRelation)
    setError(null)
    setSuccessMsg(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!emergencyContactName.trim() || !emergencyContactPhone.trim()) {
      setError("Please provide both emergency contact name and phone number.")
      return
    }

    setError(null)
    setSuccessMsg(null)

    startTransition(async () => {
      const res = await requestProfileUpdate({
        studentId,
        emergencyContactName: emergencyContactName.trim(),
        emergencyContactPhone: emergencyContactPhone.trim(),
        emergencyContactRelation: emergencyContactRelation.trim() || undefined,
      })

      if (res.success) {
        setSuccessMsg("Profile update request submitted! Awaiting teacher/admin approval.")
        setTimeout(() => {
          setOpen(false)
          resetForm()
          router.refresh()
        }, 1200)
      } else {
        setError(res.error || "Failed to submit profile update request.")
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
            <Edit3 className="h-4 w-4 text-blue-600" />
            {triggerText}
          </Button>
        }
      />
      <DialogContent className="max-w-md bg-white rounded-xl shadow-xl border border-slate-200 p-6 overflow-hidden">
        <DialogHeader className="border-b border-slate-100 pb-4 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
              <Phone className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900">
                Request Profile Update
              </DialogTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                Proposed edits require school approval before taking effect.
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
              Emergency Contact Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Robert Smith"
              value={emergencyContactName}
              onChange={(e) => setEmergencyContactName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 placeholder-slate-400"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">
              Emergency Contact Phone <span className="text-rose-500">*</span>
            </label>
            <input
              type="tel"
              required
              placeholder="e.g. +1 555 019 2831"
              value={emergencyContactPhone}
              onChange={(e) => setEmergencyContactPhone(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 placeholder-slate-400"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">Relationship to Student</label>
            <input
              type="text"
              placeholder="e.g. Father, Mother, Guardian, Aunt"
              value={emergencyContactRelation}
              onChange={(e) => setEmergencyContactRelation(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 placeholder-slate-400"
            />
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
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs gap-2"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <UserCheck className="h-3.5 w-3.5" />
                  Submit Request
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
