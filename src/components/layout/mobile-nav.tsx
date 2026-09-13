"use client"

import { useState } from "react"
import { Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sidebar } from "./sidebar"

interface MobileNavProps {
  role: "ADMIN" | "TEACHER" | "STUDENT" | "PARENT"
  schoolName: string
  isClassTeacher?: boolean
}

export function MobileNav({ role, schoolName, isClassTeacher }: MobileNavProps) {
  const [open, setOpen] = useState(false)

  if (!open) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden h-8 w-8 text-slate-700 hover:bg-slate-100"
        onClick={() => setOpen(true)}
      >
        <Menu className="h-5 w-5 text-slate-700" />
      </Button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex md:hidden">
      <div
        className="fixed inset-0 bg-slate-900/40"
        onClick={() => setOpen(false)}
      />
      <div className="relative flex w-[80%] max-w-[280px] flex-col bg-white border-r border-slate-200 h-full">
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-3 top-3 z-50 text-slate-500 hover:text-slate-900 h-8 w-8"
          onClick={() => setOpen(false)}
        >
          <X className="h-5 w-5" />
        </Button>
        <div className="flex-1 overflow-y-auto" onClick={() => setOpen(false)}>
          <Sidebar role={role} schoolName={schoolName} isClassTeacher={isClassTeacher} />
        </div>
      </div>
    </div>
  )
}
