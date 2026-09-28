"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { createLeaveRequest } from "@/app/actions/operations.actions"
import { LeaveType } from "@prisma/client"
import { Plus, Loader2, CalendarDays } from "lucide-react"

const leaveSchema = z.object({
  type: z.nativeEnum(LeaveType),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  reason: z.string().min(3, "Reason must be at least 3 characters"),
})

type LeaveFormValues = z.infer<typeof leaveSchema>

export function ApplyLeaveDialog() {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const today = new Date().toISOString().split("T")[0]

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<LeaveFormValues>({
    resolver: zodResolver(leaveSchema),
    defaultValues: {
      type: LeaveType.CASUAL,
      startDate: today,
      endDate: today,
      reason: "",
    },
  })

  const onSubmit = (data: LeaveFormValues) => {
    setError(null)
    startTransition(async () => {
      try {
        await createLeaveRequest({
          type: data.type,
          startDate: new Date(data.startDate),
          endDate: new Date(data.endDate),
          reason: data.reason,
        })
        reset()
        setOpen(false)
        router.refresh()
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message)
        } else {
          setError("Failed to submit leave request.")
        }
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" variant="outline" className="gap-1.5 text-xs text-slate-700 hover:bg-slate-100">
            <Plus className="h-3.5 w-3.5 text-slate-500" />
            <span>Apply for Leave</span>
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-blue-600" />
            <span>Submit Leave Request</span>
          </DialogTitle>
          <DialogDescription>
            Submit an official leave application for administrative approval.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 p-3 text-xs text-red-700 font-medium">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="leave-type" className="text-xs font-semibold text-slate-700">
              Leave Category <span className="text-red-500">*</span>
            </Label>
            <select
              id="leave-type"
              {...register("type")}
              disabled={isPending}
              className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
            >
              <option value="CASUAL">Casual Leave</option>
              <option value="SICK">Sick Leave</option>
              <option value="MATERNITY">Maternity / Paternity Leave</option>
              <option value="OTHER">Other Absence</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="leave-startDate" className="text-xs font-semibold text-slate-700">
                Start Date <span className="text-red-500">*</span>
              </Label>
              <Input
                id="leave-startDate"
                type="date"
                {...register("startDate")}
                disabled={isPending}
              />
              {errors.startDate && (
                <p className="text-[11px] text-red-600 font-medium">{errors.startDate.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="leave-endDate" className="text-xs font-semibold text-slate-700">
                End Date <span className="text-red-500">*</span>
              </Label>
              <Input
                id="leave-endDate"
                type="date"
                {...register("endDate")}
                disabled={isPending}
              />
              {errors.endDate && (
                <p className="text-[11px] text-red-600 font-medium">{errors.endDate.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="leave-reason" className="text-xs font-semibold text-slate-700">
              Reason for Absence <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="leave-reason"
              placeholder="Provide context or explanation for absence..."
              {...register("reason")}
              disabled={isPending}
              className="text-xs"
            />
            {errors.reason && (
              <p className="text-[11px] text-red-600 font-medium">{errors.reason.message}</p>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white"
              disabled={isPending}
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Request
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
