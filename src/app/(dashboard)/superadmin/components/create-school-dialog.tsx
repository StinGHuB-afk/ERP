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
import { createSchool } from "@/app/actions/tenant.actions"
import { Plus, Loader2 } from "lucide-react"

const schoolSchema = z.object({
  name: z.string().min(2, "School name is required"),
  domain: z.string().optional(),
  address: z.string().optional(),
})

type SchoolFormValues = z.infer<typeof schoolSchema>

export function CreateSchoolDialog() {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SchoolFormValues>({
    resolver: zodResolver(schoolSchema),
    defaultValues: {
      name: "",
      domain: "",
      address: "",
    },
  })

  const onSubmit = (data: SchoolFormValues) => {
    setError(null)
    startTransition(async () => {
      try {
        await createSchool({
          name: data.name,
          domain: data.domain?.trim() || undefined,
          address: data.address?.trim() || undefined,
        })
        reset()
        setOpen(false)
        router.refresh()
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message)
        } else {
          setError("Failed to create school. Please try again.")
        }
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="h-4 w-4" />
            <span>Create School</span>
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Add New Tenant School</DialogTitle>
          <DialogDescription>
            Register a new institution to initialize tenant workspace and RBAC isolation.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 p-3 text-xs text-red-700 font-medium">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-xs font-semibold text-slate-700">
              School Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              placeholder="e.g. St. Xavier High School"
              {...register("name")}
              disabled={isPending}
            />
            {errors.name && (
              <p className="text-[11px] text-red-600 font-medium">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="domain" className="text-xs font-semibold text-slate-700">
              Custom Domain (Optional)
            </Label>
            <Input
              id="domain"
              placeholder="e.g. stxavier.edumanage.com"
              {...register("domain")}
              disabled={isPending}
            />
            {errors.domain && (
              <p className="text-[11px] text-red-600 font-medium">{errors.domain.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="address" className="text-xs font-semibold text-slate-700">
              Address / City (Optional)
            </Label>
            <Input
              id="address"
              placeholder="e.g. 124 Park Avenue, Mumbai"
              {...register("address")}
              disabled={isPending}
            />
            {errors.address && (
              <p className="text-[11px] text-red-600 font-medium">{errors.address.message}</p>
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
              Create School
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
