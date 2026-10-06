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
  const [isLoadingSchools, setIsLoadingSchools] = useState(true)

  useEffect(() => {
    if (currentRole === "SUPERADMIN") {
      getTenantList()
        .then((data) => {
          setSchools(data)
          setIsLoadingSchools(false)
        })
        .catch((err) => {
          console.error(err)
          setIsLoadingSchools(false)
        })
    }
  }, [currentRole])

  if (currentRole !== "SUPERADMIN") {
    return null
  }

  const selectedValue = initialTenantId || "global"

  const getSelectedLabel = () => {
    if (selectedValue === "global") {
      return "Global Superadmin View"
    }
    const foundSchool = schools.find((s) => s.id === selectedValue)
    if (foundSchool) {
      return foundSchool.name
    }
    if (isLoadingSchools) {
      return "Loading tenant..."
    }
    return "Selected School"
  }

  const selectedLabel = getSelectedLabel()

  const handleValueChange = (value: string | null) => {
    if (!value) return
    startTransition(async () => {
      await setSuperadminTenantContext(value === "global" ? null : value)
      const targetPath = value === "global" ? "/superadmin" : "/admin"
      window.location.href = targetPath
    })
  }

  return (
    <div className="flex items-center gap-1.5">
      <div className="hidden sm:flex items-center text-xs font-semibold text-slate-500 mr-1">
        <Building2 className="h-3.5 w-3.5 text-slate-500 mr-1" />
        Tenant:
      </div>
      <Select
        value={selectedValue}
        onValueChange={handleValueChange}
        disabled={isPending}
      >
        <SelectTrigger className="w-[200px] h-8 bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-800 focus:ring-0 focus:ring-offset-0 dark:bg-slate-100 dark:text-slate-800 dark:border-slate-200">
          <SelectValue placeholder="Select context">
            <span className="truncate block max-w-[150px]">{selectedLabel}</span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="w-[320px] bg-white text-slate-900 border border-slate-200 shadow-md">
          <SelectItem value="global" className="text-xs font-medium cursor-pointer">
            <span className="truncate pr-6 block font-bold text-slate-800">Global Superadmin View</span>
          </SelectItem>
          {schools.map((school: any) => (
            <SelectItem key={school.id} value={school.id} className="text-xs font-medium cursor-pointer py-1.5">
              <div className="flex flex-col text-left">
                <span className="font-bold text-slate-900">{school.name}</span>
                <span className="text-[10px] text-slate-500 font-medium leading-tight">
                  👥 {school.userCounts?.total ?? 0} Users (T: {school.userCounts?.teachers ?? 0} • S: {school.userCounts?.students ?? 0} • P: {school.userCounts?.parents ?? 0} • L: {school.userCounts?.librarians ?? 0} • A: {school.userCounts?.admins ?? 0})
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
