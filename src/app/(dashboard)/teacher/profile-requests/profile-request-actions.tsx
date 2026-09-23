"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { processProfileUpdate } from "@/app/actions/enterprise"
import { Button } from "@/components/ui/button"
import { CheckCircle2, XCircle, Loader2, AlertCircle } from "lucide-react"

interface ProfileRequestActionsProps {
  requestId: string
  studentName: string
}

export function ProfileRequestActions({
  requestId,
  studentName,
}: ProfileRequestActionsProps) {
  const [isPending, startTransition] = useTransition()
  const [showRejectInput, setShowRejectInput] = useState(false)
  const [rejectionReason, setRejectionReason] = useState("")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const router = useRouter()

  function handleApprove() {
    setErrorMessage(null)
    startTransition(async () => {
      const res = await processProfileUpdate(requestId, "APPROVED")
      if (res.success) {
        router.refresh()
      } else {
        setErrorMessage(res.error || "Failed to approve request.")
      }
    })
  }

  function handleRejectSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrorMessage(null)
    startTransition(async () => {
      const res = await processProfileUpdate(
        requestId,
        "REJECTED",
        rejectionReason.trim() || undefined
      )
      if (res.success) {
        setShowRejectInput(false)
        router.refresh()
      } else {
        setErrorMessage(res.error || "Failed to reject request.")
      }
    })
  }

  return (
    <div className="space-y-2">
      {errorMessage && (
        <div className="p-2 bg-rose-50 border border-rose-200 rounded text-[11px] text-rose-700 flex items-center gap-1.5">
          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {!showRejectInput ? (
        <div className="flex items-center gap-2 justify-end">
          <Button
            size="sm"
            onClick={handleApprove}
            disabled={isPending}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs gap-1.5 h-8"
          >
            {isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5" />
            )}
            Approve Edits
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowRejectInput(true)}
            disabled={isPending}
            className="border-rose-200 text-rose-700 hover:bg-rose-50 font-semibold text-xs gap-1.5 h-8 bg-white"
          >
            <XCircle className="h-3.5 w-3.5" />
            Decline
          </Button>
        </div>
      ) : (
        <form onSubmit={handleRejectSubmit} className="flex flex-col gap-2 p-2 bg-rose-50/60 rounded-lg border border-rose-200">
          <label className="text-[11px] font-semibold text-rose-900">
            Rejection Reason for {studentName}:
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Unverified phone number, Incorrect relation"
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            className="w-full px-2.5 py-1 text-xs border border-rose-300 rounded focus:outline-none focus:ring-1 focus:ring-rose-500 bg-white"
          />
          <div className="flex items-center gap-2 justify-end pt-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowRejectInput(false)}
              disabled={isPending}
              className="text-xs h-7 text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isPending}
              className="bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs gap-1 h-7"
            >
              {isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <XCircle className="h-3 w-3" />
              )}
              Confirm Rejection
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
