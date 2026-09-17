"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useTransition } from "react"
import { Calendar } from "lucide-react"

export interface AcademicSessionOption {
  id: string
  name: string
  status?: string
}

interface SessionSwitcherProps {
  sessions?: AcademicSessionOption[]
  currentSessionId?: string
}

export function SessionSwitcher({ sessions = [], currentSessionId = "" }: SessionSwitcherProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const activeSessionIdFromUrl = searchParams.get("session") || currentSessionId

  const handleSessionChange = (newSessionId: string) => {
    // Strict Guard Clause: prevent push/render loop if already on the selected session
    if (!newSessionId || newSessionId === activeSessionIdFromUrl) return

    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString())
      params.set("session", newSessionId)
      router.push(`${pathname}?${params.toString()}`)
    })
  }

  const selectedSession = sessions.find((s) => s.id === activeSessionIdFromUrl) || sessions[0]

  return (
    <div className="relative inline-flex items-center">
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-200/70 transition-colors focus-within:ring-2 focus-within:ring-blue-500/20">
        <Calendar className="h-3.5 w-3.5 text-slate-500 flex-shrink-0" />
        <span className="text-[11px] font-semibold text-slate-500 hidden sm:inline">Session:</span>
        <select
          value={selectedSession?.id || activeSessionIdFromUrl}
          onChange={(e) => handleSessionChange(e.target.value)}
          disabled={isPending}
          aria-label="Select Academic Session"
          className="bg-transparent text-xs font-semibold text-slate-900 focus:outline-none cursor-pointer pr-1 disabled:opacity-50"
        >
          {sessions.length === 0 && (
            <option value={activeSessionIdFromUrl}>
              {selectedSession?.name || "Loading..."}
            </option>
          )}
          {sessions.map((s) => (
            <option key={s.id} value={s.id} className="bg-white text-slate-900">
              {s.name} {s.status === "ACTIVE" ? "(Current)" : ""}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
