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
import { provisionTenantAdmin } from "@/app/actions/tenant.actions"
import { UserPlus, Loader2, KeyRound } from "lucide-react"

const adminSchema = z.object({
  name: z.string().min(2, "Admin name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
})

type AdminFormValues = z.infer<typeof adminSchema>

interface ProvisionAdminDialogProps {
  schoolId: string
  schoolName: string
}

export function ProvisionAdminDialog({ schoolId, schoolName }: ProvisionAdminDialogProps) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AdminFormValues>({
    resolver: zodResolver(adminSchema),
    defaultValues: {
      name: "",
      email: "",
    },
  })

  const onSubmit = (data: AdminFormValues) => {
    setError(null)
    startTransition(async () => {
      try {
        await provisionTenantAdmin({
          name: data.name,
          email: data.email,
          schoolId,
        })
        reset()
        setOpen(false)
        router.refresh()
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message)
        } else {
          setError("Failed to provision administrator. Please try again.")
        }
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs text-slate-700 hover:text-slate-900 hover:bg-slate-100"
          >
            <UserPlus className="h-3.5 w-3.5 text-slate-500" />
            <span>Provision Admin</span>
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Provision School Administrator</DialogTitle>
          <DialogDescription>
            Create the primary administrator account for{" "}
            <span className="font-semibold text-slate-900">{schoolName}</span>.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 p-3 text-xs text-red-700 font-medium">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="admin-name" className="text-xs font-semibold text-slate-700">
              Administrator Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="admin-name"
              placeholder="e.g. Principal Robert Davis"
              {...register("name")}
              disabled={isPending}
            />
            {errors.name && (
              <p className="text-[11px] text-red-600 font-medium">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="admin-email" className="text-xs font-semibold text-slate-700">
              Administrator Email <span className="text-red-500">*</span>
            </Label>
            <Input
              id="admin-email"
              type="email"
              placeholder="e.g. admin@school.org"
              {...register("email")}
              disabled={isPending}
            />
            {errors.email && (
              <p className="text-[11px] text-red-600 font-medium">{errors.email.message}</p>
            )}
          </div>

          <div className="rounded-md border border-slate-200 bg-slate-50/80 p-3 text-xs text-slate-600 space-y-1">
            <div className="flex items-center gap-1.5 font-medium text-slate-800">
              <KeyRound className="h-3.5 w-3.5 text-slate-500" />
              <span>Initial Credentials</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Default password will be initialized to{" "}
              <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono text-slate-800">
                Admin@12345
              </code>
              . The admin will be prompted to reset password on first login.
            </p>
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
              Provision Account
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
