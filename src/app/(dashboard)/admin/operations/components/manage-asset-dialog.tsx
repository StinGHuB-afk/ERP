"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
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
import { Label } from "@/components/ui/label"
import { assignAsset, updateAssetStatus } from "@/app/actions/operations.actions"
import { Settings2, Loader2, UserCheck, Wrench, AlertTriangle } from "lucide-react"

interface ManageAssetDialogProps {
  assetId: string
  assetName: string
  currentStatus: string
  assignedToId?: string | null
  users: { id: string; name: string | null; email: string; role: string }[]
}

export function ManageAssetDialog({
  assetId,
  assetName,
  currentStatus,
  assignedToId,
  users,
}: ManageAssetDialogProps) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [targetUserId, setTargetUserId] = useState<string>(assignedToId || users[0]?.id || "")
  const [selectedStatus, setSelectedStatus] = useState<"AVAILABLE" | "MAINTENANCE" | "LOST">(
    currentStatus === "MAINTENANCE" || currentStatus === "LOST"
      ? (currentStatus as "MAINTENANCE" | "LOST")
      : "AVAILABLE"
  )
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const handleAssign = () => {
    if (!targetUserId) {
      setError("Please select a user to assign the asset.")
      return
    }
    setError(null)
    startTransition(async () => {
      try {
        await assignAsset(assetId, targetUserId)
        setOpen(false)
        router.refresh()
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message)
        } else {
          setError("Failed to assign asset.")
        }
      }
    })
  }

  const handleStatusUpdate = () => {
    setError(null)
    startTransition(async () => {
      try {
        await updateAssetStatus(assetId, selectedStatus)
        setOpen(false)
        router.refresh()
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message)
        } else {
          setError("Failed to update asset status.")
        }
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="xs" variant="outline" className="h-7 text-[11px] text-slate-700 hover:bg-slate-100 gap-1">
            <Settings2 className="h-3 w-3 text-slate-500" />
            <span>Manage Asset</span>
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-blue-600" />
            <span>Manage Asset: {assetName}</span>
          </DialogTitle>
          <DialogDescription>
            Assign asset to a tenant user or transition operational status (Maintenance / Lost / Available).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 p-3 text-xs text-red-700 font-medium">
              {error}
            </div>
          )}

          {/* Section 1: Assign Asset */}
          <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3.5 space-y-3">
            <div className="flex items-center gap-1.5 font-semibold text-xs text-slate-800">
              <UserCheck className="h-4 w-4 text-blue-600" />
              <span>Assign Asset Holder</span>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="assign-user" className="text-xs font-medium text-slate-600">
                Select User (Staff / Student)
              </Label>
              <select
                id="assign-user"
                value={targetUserId}
                onChange={(e) => setTargetUserId(e.target.value)}
                disabled={isPending}
                className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name || u.email} ({u.role}) — {u.email}
                  </option>
                ))}
              </select>
            </div>

            <Button
              type="button"
              size="sm"
              onClick={handleAssign}
              disabled={isPending || !targetUserId}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs w-full"
            >
              {isPending && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
              Assign Holder
            </Button>
          </div>

          {/* Section 2: Update Operational Status */}
          <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3.5 space-y-3">
            <div className="flex items-center gap-1.5 font-semibold text-xs text-slate-800">
              <Wrench className="h-4 w-4 text-amber-600" />
              <span>Change Operational Status</span>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              Transitioning to Maintenance or Lost will automatically un-assign any active user holder.
            </p>

            <div className="space-y-1.5">
              <Label htmlFor="asset-status" className="text-xs font-medium text-slate-600">
                New Status
              </Label>
              <select
                id="asset-status"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as "AVAILABLE" | "MAINTENANCE" | "LOST")}
                disabled={isPending}
                className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
              >
                <option value="AVAILABLE">Available (Unassigned)</option>
                <option value="MAINTENANCE">Under Maintenance</option>
                <option value="LOST">Reported Lost</option>
              </select>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleStatusUpdate}
              disabled={isPending}
              className="text-xs w-full border-slate-300 hover:bg-slate-100 text-slate-700"
            >
              {isPending && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
              Update Status
            </Button>
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
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
