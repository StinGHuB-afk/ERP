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
import { recordTransaction } from "@/app/actions/finance.actions"
import { TransactionType, TransactionStatus } from "@prisma/client"
import { Plus, Loader2, Receipt } from "lucide-react"

const transactionSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters"),
  amount: z.number().positive("Amount must be a positive number"),
  type: z.nativeEnum(TransactionType),
  status: z.nativeEnum(TransactionStatus),
  userId: z.string().min(1, "Target user ID is required"),
  description: z.string().optional(),
  referenceId: z.string().optional(),
})

type TransactionFormValues = z.infer<typeof transactionSchema>

interface RecordTransactionDialogProps {
  users?: { id: string; name: string | null; email: string; role: string }[]
}

export function RecordTransactionDialog({ users = [] }: RecordTransactionDialogProps) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      title: "",
      amount: 0,
      type: TransactionType.FEE_PAYMENT,
      status: TransactionStatus.COMPLETED,
      userId: users[0]?.id || "",
      description: "",
      referenceId: "",
    },
  })

  const onSubmit = (data: TransactionFormValues) => {
    setError(null)
    startTransition(async () => {
      try {
        await recordTransaction({
          title: data.title,
          amount: data.amount,
          type: data.type,
          status: data.status,
          userId: data.userId,
          description: data.description?.trim() || undefined,
          referenceId: data.referenceId?.trim() || undefined,
        })
        reset()
        setOpen(false)
        router.refresh()
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message)
        } else {
          setError("Failed to record transaction.")
        }
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs">
            <Plus className="h-3.5 w-3.5 text-white" />
            <span>Record Transaction</span>
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-blue-600" />
            <span>Record Financial Transaction</span>
          </DialogTitle>
          <DialogDescription>
            Log a fee payment, salary payout, fine, or refund to update the tenant ledger.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 p-3 text-xs text-red-700 font-medium">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="txn-title" className="text-xs font-semibold text-slate-700">
              Transaction Title <span className="text-red-500">*</span>
            </Label>
            <Input
              id="txn-title"
              placeholder="e.g. Q1 Tuition Fee Payment"
              {...register("title")}
              disabled={isPending}
            />
            {errors.title && (
              <p className="text-[11px] text-red-600 font-medium">{errors.title.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="txn-amount" className="text-xs font-semibold text-slate-700">
                Amount (₹) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="txn-amount"
                type="number"
                step="0.01"
                placeholder="12500"
                {...register("amount", { valueAsNumber: true })}
                disabled={isPending}
              />
              {errors.amount && (
                <p className="text-[11px] text-red-600 font-medium">{errors.amount.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="txn-type" className="text-xs font-semibold text-slate-700">
                Transaction Type <span className="text-red-500">*</span>
              </Label>
              <select
                id="txn-type"
                {...register("type")}
                disabled={isPending}
                className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
              >
                <option value="FEE_PAYMENT">Fee Payment</option>
                <option value="SALARY_PAYOUT">Salary Payout</option>
                <option value="FINE">Fine</option>
                <option value="REFUND">Refund</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="txn-status" className="text-xs font-semibold text-slate-700">
                Status <span className="text-red-500">*</span>
              </Label>
              <select
                id="txn-status"
                {...register("status")}
                disabled={isPending}
                className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
              >
                <option value="COMPLETED">Completed</option>
                <option value="PENDING">Pending</option>
                <option value="FAILED">Failed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="txn-ref" className="text-xs font-semibold text-slate-700">
                Reference ID (Optional)
              </Label>
              <Input
                id="txn-ref"
                placeholder="e.g. TXN_987421"
                {...register("referenceId")}
                disabled={isPending}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="txn-userId" className="text-xs font-semibold text-slate-700">
              Target User (Payer / Recipient) <span className="text-red-500">*</span>
            </Label>
            {users.length > 0 ? (
              <select
                id="txn-userId"
                {...register("userId")}
                disabled={isPending}
                className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name || u.email} ({u.role}) — {u.email}
                  </option>
                ))}
              </select>
            ) : (
              <Input
                id="txn-userId"
                placeholder="Enter User ID (UUID)"
                {...register("userId")}
                disabled={isPending}
              />
            )}
            {errors.userId && (
              <p className="text-[11px] text-red-600 font-medium">{errors.userId.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="txn-desc" className="text-xs font-semibold text-slate-700">
              Description (Optional)
            </Label>
            <Input
              id="txn-desc"
              placeholder="e.g. Paid online via Net Banking"
              {...register("description")}
              disabled={isPending}
            />
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
              Record Entry
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
