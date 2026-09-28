"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { reviewLeaveRequest } from "@/app/actions/operations.actions"
import { Check, X, Loader2 } from "lucide-react"

interface LeaveActionButtonsProps {
  leaveId: string
}

export function LeaveActionButtons({ leaveId }: LeaveActionButtonsProps) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const handleReview = (status: "APPROVED" | "REJECTED") => {
    startTransition(async () => {
      try {
        await reviewLeaveRequest(leaveId, status)
        router.refresh()
      } catch (err: unknown) {
        console.error("Failed to review leave request:", err)
      }
    })
  }

  return (
    <div className="flex items-center justify-end gap-1.5">
      {isPending ? (
        <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
      ) : (
        <>
          <Button
            size="xs"
            variant="outline"
            onClick={() => handleReview("APPROVED")}
            disabled={isPending}
            className="h-7 text-[11px] font-medium text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 border-emerald-300 gap-1"
          >
            <Check className="h-3 w-3" />
            <span>Approve</span>
          </Button>

          <Button
            size="xs"
            variant="outline"
            onClick={() => handleReview("REJECTED")}
            disabled={isPending}
            className="h-7 text-[11px] font-medium text-red-700 hover:bg-red-50 hover:text-red-800 border-red-300 gap-1"
          >
            <X className="h-3 w-3" />
            <span>Reject</span>
          </Button>
        </>
      )}
    </div>
  )
}
