"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { finalizeReportCardWithCryptoSignature } from "@/app/actions/verification"
import { Lock, AlertTriangle, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface FinalizeRecordDialogProps {
  recordId: string
  studentName: string
  className: string
  isAlreadyFinalized?: boolean
}

/**
 * Guarded Finalization Workflow Dialog
 * Prevents accidental or casual finalization by requiring a deliberate confirmation step.
 * Clearly warns teachers/admins that finalizing locks academic records against further edits.
 */
export function FinalizeRecordDialog({
  recordId,
  studentName,
  className,
  isAlreadyFinalized = false,
}: FinalizeRecordDialogProps) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  if (isAlreadyFinalized) {
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-100 border border-slate-200 text-xs font-medium text-slate-600">
        <Lock className="h-3.5 w-3.5 text-slate-400" />
        <span>Term Record Finalized</span>
      </div>
    )
  }

  const handleFinalizeConfirm = () => {
    startTransition(async () => {
      const result = await finalizeReportCardWithCryptoSignature(recordId)

      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(`Academic record for ${studentName} has been finalized and locked.`)
        setOpen(false)
        router.refresh()
      }
    })
  }

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs h-8 px-3 rounded-md shadow-subtle flex items-center gap-1.5"
      >
        <Lock className="h-3.5 w-3.5 text-slate-300" />
        <span>Finalize Record</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-white border border-slate-200 rounded-lg p-6 max-w-md">
          <DialogHeader className="border-b border-slate-200 pb-3 mb-2">
            <div className="flex items-center gap-2 text-slate-900">
              <Lock className="h-5 w-5 text-amber-600 flex-shrink-0" />
              <DialogTitle className="text-base font-semibold">Finalize Academic Record</DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-500 mt-1">
              Guarded Business Control Action
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-md p-3.5 text-xs text-amber-800 space-y-1">
              <div className="font-semibold flex items-center gap-1.5 text-amber-900">
                <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
                <span>Permanent Lock Warning</span>
              </div>
              <p className="leading-relaxed">
                Finalizing this academic record for <strong className="text-amber-950">{studentName}</strong> ({className}) will generate a cryptographic QR code signature and permanently lock all term marks against further edits.
              </p>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure all term marks have been accurately entered and verified?
            </p>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isPending}
                className="bg-white hover:bg-slate-100 text-slate-700 border-slate-200 text-xs font-medium h-9"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleFinalizeConfirm}
                disabled={isPending}
                className="bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs h-9 px-4 rounded-md shadow-subtle flex items-center gap-1.5"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Finalizing...</span>
                  </>
                ) : (
                  <>
                    <Lock className="h-3.5 w-3.5 text-slate-300" />
                    <span>Confirm & Finalize Record</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
