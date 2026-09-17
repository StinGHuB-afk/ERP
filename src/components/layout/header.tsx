"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { LogOut, User as UserIcon, BellRing } from "lucide-react"
import { logout } from "@/app/(auth)/login/actions"
import { MobileNav } from "./mobile-nav"

import { SessionSwitcher, AcademicSessionOption } from "./session-switcher"

export function Header({
  userName,
  role,
  academicSession,
  sessions,
  currentSessionId,
  schoolName,
  isClassTeacher,
  unreadAlertsCount = 0,
}: {
  userName: string | null
  role: "ADMIN" | "TEACHER" | "STUDENT" | "PARENT"
  academicSession: string
  sessions?: AcademicSessionOption[]
  currentSessionId?: string
  schoolName: string
  isClassTeacher?: boolean
  unreadAlertsCount?: number
}) {
  const handleLogout = async () => {
    await logout()
  }

  const alertHref = `/${role.toLowerCase()}/alerts`

  return (
    <header className="flex h-14 items-center gap-4 border-b border-slate-200 bg-white px-5 lg:px-8 justify-between sticky top-0 z-40">
      <div className="flex flex-1 items-center gap-3">
        <MobileNav role={role} schoolName={schoolName} isClassTeacher={isClassTeacher} />
        <h1 className="hidden sm:block text-sm font-semibold tracking-tight text-slate-900 capitalize">
          {role.toLowerCase()} Portal
        </h1>
        <SessionSwitcher sessions={sessions} currentSessionId={currentSessionId} />
      </div>

      <div className="flex items-center gap-4">
        {/* Unread Alerts Link — Bare Icon, No Shadows */}
        <Link
          href={alertHref}
          className="relative p-1.5 text-slate-500 hover:text-slate-900 transition-colors rounded-md hover:bg-slate-100"
          title="Notifications & Alerts"
        >
          <BellRing className="h-4 w-4" />
          {unreadAlertsCount > 0 && (
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-600" />
          )}
        </Link>

        <div className="h-4 w-px bg-slate-200 hidden sm:block" />

        {/* User Identity Info — Bare Text, No Squircle Container */}
        <div className="flex items-center gap-2">
          <UserIcon className="h-4 w-4 text-slate-500 flex-shrink-0" />
          <div className="flex flex-col text-left">
            <span className="text-xs font-semibold leading-tight text-slate-900">{userName || "User"}</span>
            <span className="text-[10px] text-slate-500 capitalize">{role.toLowerCase()}</span>
          </div>
        </div>

        <div className="h-4 w-px bg-slate-200" />

        {/* Clean Logout Action */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          title="Log out"
          className="text-slate-600 hover:text-red-600 hover:bg-red-50 text-xs font-medium px-2.5 h-8 gap-1.5"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Logout</span>
        </Button>
      </div>
    </header>
  )
}
