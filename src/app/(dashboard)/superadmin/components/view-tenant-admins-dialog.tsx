"use client"

import { useState, useEffect } from "react"
import { Shield, Loader2, UserX } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { getTenantAdmins } from "@/app/actions/tenant.actions"
import { Badge } from "@/components/ui/badge"

interface ViewTenantAdminsDialogProps {
  schoolId: string
  schoolName: string
}

export function ViewTenantAdminsDialog({ schoolId, schoolName }: ViewTenantAdminsDialogProps) {
  const [open, setOpen] = useState(false)
  const [admins, setAdmins] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (open) {
      setIsLoading(true)
      getTenantAdmins(schoolId)
        .then(setAdmins)
        .catch(console.error)
        .finally(() => setIsLoading(false))
    }
  }, [open, schoolId])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs text-slate-700 hover:text-slate-900 hover:bg-slate-100 ml-2"
        >
          <Shield className="h-3.5 w-3.5 text-slate-500" />
          <span>Admins</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Tenant Administrators</DialogTitle>
          <DialogDescription>
            Administrative users provisioned for <span className="font-semibold text-slate-900">{schoolName}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {isLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : admins.length === 0 ? (
            <div className="text-center py-8 px-4 border border-dashed border-slate-200 rounded-lg">
              <UserX className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-900">No administrators found</p>
              <p className="text-xs text-slate-500 mt-1">
                Use the "Provision Admin" action to create an administrative account for this tenant.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {admins.map((admin) => (
                <div key={admin.id} className="flex items-center justify-between p-3 border border-slate-100 rounded-lg bg-slate-50">
                  <div className="space-y-1">
                    <div className="font-semibold text-slate-900 text-sm">{admin.name || "Unnamed Admin"}</div>
                    <div className="text-xs text-slate-500 font-mono">{admin.email}</div>
                  </div>
                  <Badge className="bg-purple-100 text-purple-700 border-purple-200 uppercase tracking-wider text-[10px]">
                    {admin.role}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
