"use client"

import { useState, useEffect, useTransition } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Settings, Loader2 } from "lucide-react"
import { toggleTenantModule, getModulesForSchool } from "@/app/actions/entitlements.actions"
import { useRouter } from "next/navigation"

interface ManageModulesDialogProps {
  schoolId: string
  schoolName: string
}

export function ManageModulesDialog({ schoolId, schoolName }: ManageModulesDialogProps) {
  const [open, setOpen] = useState(false)
  const [modules, setModules] = useState<Record<string, boolean>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  useEffect(() => {
    if (open) {
      setIsLoading(true)
      getModulesForSchool(schoolId)
        .then(setModules)
        .catch(console.error)
        .finally(() => setIsLoading(false))
    }
  }, [open, schoolId])

  const handleToggle = (moduleKey: string, isEnabled: boolean) => {
    setModules(prev => ({ ...prev, [moduleKey]: isEnabled }))
    startTransition(async () => {
      try {
        await toggleTenantModule(schoolId, moduleKey, isEnabled)
        router.refresh()
      } catch (err) {
        console.error("Failed to toggle module", err)
        // Revert on failure
        setModules(prev => ({ ...prev, [moduleKey]: !isEnabled }))
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
            className="gap-1.5 text-xs text-slate-700 hover:text-slate-900 hover:bg-slate-100 ml-2"
          >
            <Settings className="h-3.5 w-3.5 text-slate-500" />
            <span>Modules</span>
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Manage Modules</DialogTitle>
          <DialogDescription>
            Enable or disable modules for{" "}
            <span className="font-semibold text-slate-900">{schoolName}</span>.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 space-y-6">
          {isLoading ? (
            <div className="flex justify-center p-4">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between border-b pb-4">
                <div className="space-y-0.5">
                  <Label className="text-base font-semibold">Payroll & Salary</Label>
                  <p className="text-sm text-slate-500">Enable payroll runs and salary management.</p>
                </div>
                <Switch 
                  checked={!!modules["PAYROLL"]} 
                  onCheckedChange={(c) => handleToggle("PAYROLL", c)}
                  disabled={isPending}
                />
              </div>

              <div className="flex items-center justify-between pb-2">
                <div className="space-y-0.5">
                  <Label className="text-base font-semibold">Library Management</Label>
                  <p className="text-sm text-slate-500">Enable book cataloging and circulation.</p>
                </div>
                <Switch 
                  checked={!!modules["LIBRARY"]} 
                  onCheckedChange={(c) => handleToggle("LIBRARY", c)}
                  disabled={isPending}
                />
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
