"use client"

import { useState, useEffect, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getTenantList, setSuperadminTenantContext } from "@/app/actions/tenant.actions"
import { Building2 } from "lucide-react"

interface TenantSwitcherProps {
  currentRole: string
  initialTenantId: string | null
}

export function TenantSwitcher({ currentRole, initialTenantId }: TenantSwitcherProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [schools, setSchools] = useState<{ id: string; name: string }[]>([])
  
  useEffect(() => {
    if (currentRole === "SUPERADMIN") {
      getTenantList().then(setSchools).catch(console.error)
    }
  }, [currentRole])

  if (currentRole !== "SUPERADMIN") {
    return null
  }

  const handleValueChange = (value: string | null) => {
    if (!value) return
    startTransition(async () => {
      await setSuperadminTenantContext(value === "global" ? null : value)
      router.refresh()
    })
  }

  return (
    <div className="flex items-center gap-2">
      <div className="hidden sm:flex items-center text-sm font-medium text-slate-500 mr-1">
        <Building2 className="h-4 w-4 mr-2" />
        Tenant:
      </div>
      <Select
        defaultValue={initialTenantId || "global"}
        onValueChange={handleValueChange}
        disabled={isPending}
      >
        <SelectTrigger className="w-[180px] h-9 bg-white dark:bg-slate-950">
          <SelectValue placeholder="Select context" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="global">Global Superadmin View</SelectItem>
          {schools.map((school) => (
            <SelectItem key={school.id} value={school.id}>
              {school.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
