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
import { createAsset } from "@/app/actions/operations.actions"
import { AssetCategory } from "@prisma/client"
import { Plus, Loader2, Package } from "lucide-react"

const assetSchema = z.object({
  name: z.string().min(2, "Asset name is required"),
  category: z.nativeEnum(AssetCategory),
  identifier: z.string().optional(),
})

type AssetFormValues = z.infer<typeof assetSchema>

export function RegisterAssetDialog() {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AssetFormValues>({
    resolver: zodResolver(assetSchema),
    defaultValues: {
      name: "",
      category: AssetCategory.LAPTOP,
      identifier: "",
    },
  })

  const onSubmit = (data: AssetFormValues) => {
    setError(null)
    startTransition(async () => {
      try {
        await createAsset({
          name: data.name,
          category: data.category,
          identifier: data.identifier?.trim() || undefined,
        })
        reset()
        setOpen(false)
        router.refresh()
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message)
        } else {
          setError("Failed to register asset.")
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
            <span>Register Asset</span>
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-600" />
            <span>Register New Tenant Asset</span>
          </DialogTitle>
          <DialogDescription>
            Add a device, textbook, or facility equipment item to the tenant inventory.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 p-3 text-xs text-red-700 font-medium">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="asset-name" className="text-xs font-semibold text-slate-700">
              Asset Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="asset-name"
              placeholder="e.g. ThinkPad T14 Workstation"
              {...register("name")}
              disabled={isPending}
            />
            {errors.name && (
              <p className="text-[11px] text-red-600 font-medium">{errors.name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="asset-category" className="text-xs font-semibold text-slate-700">
                Asset Category <span className="text-red-500">*</span>
              </Label>
              <select
                id="asset-category"
                {...register("category")}
                disabled={isPending}
                className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
              >
                <option value="LAPTOP">Laptop / Workstation</option>
                <option value="BOOK">Book / Publication</option>
                <option value="ELECTRONICS">Electronics / AV</option>
                <option value="SPORTS_EQUIPMENT">Sports Equipment</option>
                <option value="FURNITURE">Furniture</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="asset-identifier" className="text-xs font-semibold text-slate-700">
                Identifier / Serial #
              </Label>
              <Input
                id="asset-identifier"
                placeholder="e.g. ISBN-978-013"
                {...register("identifier")}
                disabled={isPending}
              />
            </div>
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
              Register Asset
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
