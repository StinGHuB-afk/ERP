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
import { createFeeStructure } from "@/app/actions/finance.actions"
import { Plus, Loader2, FileSpreadsheet } from "lucide-react"

const feeSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters"),
  amount: z.number().positive("Amount must be a positive number"),
  dueDate: z.string().min(1, "Due date is required"),
  classId: z.string().optional(),
})

type FeeFormValues = z.infer<typeof feeSchema>

interface CreateFeeDialogProps {
  classes?: { id: string; name: string }[]
}

export function CreateFeeDialog({ classes = [] }: CreateFeeDialogProps) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FeeFormValues>({
    resolver: zodResolver(feeSchema),
    defaultValues: {
      title: "",
      amount: 0,
      dueDate: new Date().toISOString().split("T")[0],
      classId: "all",
    },
  })

  const onSubmit = (data: FeeFormValues) => {
    setError(null)
    startTransition(async () => {
      try {
        await createFeeStructure({
          title: data.title,
          amount: data.amount,
          dueDate: new Date(data.dueDate),
          classId: data.classId === "all" || !data.classId ? undefined : data.classId,
        })
        reset()
        setOpen(false)
        router.refresh()
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message)
        } else {
          setError("Failed to create fee template.")
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
            <span>Create Fee Template</span>
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-blue-600" />
            <span>Create Fee Structure Template</span>
          </DialogTitle>
          <DialogDescription>
            Define a recurring or term fee template to apply to a specific class or school-wide.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 p-3 text-xs text-red-700 font-medium">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="fee-title" className="text-xs font-semibold text-slate-700">
              Fee Title <span className="text-red-500">*</span>
            </Label>
            <Input
              id="fee-title"
              placeholder="e.g. Q2 Tuition & Facility Fee"
              {...register("title")}
              disabled={isPending}
            />
            {errors.title && (
              <p className="text-[11px] text-red-600 font-medium">{errors.title.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="fee-amount" className="text-xs font-semibold text-slate-700">
                Amount (₹) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="fee-amount"
                type="number"
                step="0.01"
                placeholder="5000"
                {...register("amount", { valueAsNumber: true })}
                disabled={isPending}
              />
              {errors.amount && (
                <p className="text-[11px] text-red-600 font-medium">{errors.amount.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="fee-dueDate" className="text-xs font-semibold text-slate-700">
                Due Date <span className="text-red-500">*</span>
              </Label>
              <Input
                id="fee-dueDate"
                type="date"
                {...register("dueDate")}
                disabled={isPending}
              />
              {errors.dueDate && (
                <p className="text-[11px] text-red-600 font-medium">{errors.dueDate.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fee-classId" className="text-xs font-semibold text-slate-700">
              Target Scope / Class
            </Label>
            <select
              id="fee-classId"
              {...register("classId")}
              disabled={isPending}
              className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
            >
              <option value="all">School-Wide (All Classes)</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  Class {c.name}
                </option>
              ))}
            </select>
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
              Save Template
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
