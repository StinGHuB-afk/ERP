"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { archiveUser } from "@/app/actions/archive.actions"
import { Role } from "@prisma/client"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Archive, AlertTriangle, Loader2 } from "lucide-react"

interface ArchiveUserModalProps {
  userId: string
  role: Role
  userName?: string
  redirectUrl?: string
  className?: string
}

export function ArchiveUserModal({
  userId,
  role,
  userName = "this profile",
  redirectUrl,
  className = "",
}: ArchiveUserModalProps) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleArchive() {
    setError(null)
    startTransition(async () => {
      const res = await archiveUser(userId, role)
      if (res.success) {
        setOpen(false)
        if (redirectUrl) {
          router.push(redirectUrl)
        } else {
          router.refresh()
        }
      } else {
        setError(res.error || "Failed to archive user profile.")
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
            className={`gap-2 border-rose-200 text-rose-700 hover:bg-rose-50 hover:border-rose-300 bg-white ${className}`}
            suppressHydrationWarning
          >
            <Archive className="h-4 w-4 text-rose-600" />
            Archive Profile
          </Button>
        }
      />
      <DialogContent className="max-w-md bg-white rounded-xl shadow-xl border border-slate-200 p-6 overflow-hidden">
        <DialogHeader className="border-b border-slate-100 pb-4 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-rose-100 text-rose-600 rounded-lg">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900">
                Archive {role === Role.STUDENT ? "Student" : role === Role.TEACHER ? "Teacher" : "User"} Profile
              </DialogTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                Soft-delete operation for <span className="font-semibold text-slate-800">{userName}</span>
              </p>
            </div>
          </div>
        </DialogHeader>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs font-medium">
            {error}
          </div>
        )}

        <div className="space-y-3 text-xs text-slate-600">
          <p>
            Archiving this profile will mark it as <strong className="text-slate-800">archived</strong> in the database.
          </p>
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-[11px] space-y-1">
            <span className="font-bold block text-amber-950">Safety Guarantee:</span>
            <p>
              Historical academic records, marks, and attendance logs will <strong>NOT</strong> be deleted or compromised. The account will simply be hidden from active lists.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-5 mt-4 border-t border-slate-100">
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
            type="button"
            onClick={handleArchive}
            disabled={isPending}
            className="bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs gap-2"
          >
            {isPending ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Archiving...
              </>
            ) : (
              <>
                <Archive className="h-3.5 w-3.5" />
                Confirm Archive
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
