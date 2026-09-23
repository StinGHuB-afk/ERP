"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { requestTransportChange } from "@/app/actions/enterprise"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Bus, ArrowRight, AlertCircle, CheckCircle2, Loader2 } from "lucide-react"

interface StudentTransportRequestFormProps {
  studentId: string
  currentRouteName?: string
  triggerText?: string
  className?: string
}

export function StudentTransportRequestForm({
  studentId,
  currentRouteName,
  triggerText = "Request Route Change",
  className = "",
}: StudentTransportRequestFormProps) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const [requestedRouteName, setRequestedRouteName] = useState("")
  const [requestedBusNumber, setRequestedBusNumber] = useState("")
  const [requestedPickupPoint, setRequestedPickupPoint] = useState("")
  const [requestedDropPoint, setRequestedDropPoint] = useState("")
  const [reason, setReason] = useState("")

  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const router = useRouter()

  function resetForm() {
    setRequestedRouteName("")
    setRequestedBusNumber("")
    setRequestedPickupPoint("")
    setRequestedDropPoint("")
    setReason("")
    setError(null)
    setSuccessMsg(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!requestedRouteName.trim()) {
      setError("Please specify the requested route name.")
      return
    }

    setError(null)
    setSuccessMsg(null)

    startTransition(async () => {
      const routeSlug = requestedRouteName.trim().toLowerCase().replace(/\s+/g, "_")
      const res = await requestTransportChange({
        studentId,
        currentRouteName,
        requestedRouteId: `route_${routeSlug}`,
        requestedRouteName: requestedRouteName.trim(),
        requestedBusNumber: requestedBusNumber.trim() || undefined,
        requestedPickupPoint: requestedPickupPoint.trim() || undefined,
        requestedDropPoint: requestedDropPoint.trim() || undefined,
        reason: reason.trim() || undefined,
      })

      if (res.success) {
        setSuccessMsg("Transport change request submitted! Awaiting administration review.")
        setTimeout(() => {
          setOpen(false)
          resetForm()
          router.refresh()
        }, 1200)
      } else {
        setError(res.error || "Failed to submit transport request.")
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
            <Bus className="h-4 w-4 text-blue-600" />
            {triggerText}
          </Button>
        }
      />
      <DialogContent className="max-w-md bg-white rounded-xl shadow-xl border border-slate-200 p-6 overflow-hidden">
        <DialogHeader className="border-b border-slate-100 pb-4 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
              <Bus className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900">
                Request Bus Route Change
              </DialogTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                Current Route: <span className="font-semibold text-slate-800">{currentRouteName || "Unassigned"}</span>
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
              Requested New Route Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Route 42 - North Campus"
              value={requestedRouteName}
              onChange={(e) => setRequestedRouteName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 placeholder-slate-400"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">Preferred Bus Number</label>
              <input
                type="text"
                placeholder="e.g. Bus 12"
                value={requestedBusNumber}
                onChange={(e) => setRequestedBusNumber(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 placeholder-slate-400"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">Requested Pickup Stop</label>
              <input
                type="text"
                placeholder="e.g. Central Station Stop"
                value={requestedPickupPoint}
                onChange={(e) => setRequestedPickupPoint(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 placeholder-slate-400"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">Requested Drop Stop</label>
            <input
              type="text"
              placeholder="e.g. Oak Avenue Intersection"
              value={requestedDropPoint}
              onChange={(e) => setRequestedDropPoint(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 placeholder-slate-400"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">Reason for Request</label>
            <textarea
              rows={2}
              placeholder="e.g. Relocated to new home address..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 placeholder-slate-400 resize-none"
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
                  <ArrowRight className="h-3.5 w-3.5" />
                  Submit Route Request
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
