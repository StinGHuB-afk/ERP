"use client"

import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { useCallback, useTransition } from "react"
import { Calendar, RefreshCw } from "lucide-react"

export function DateRangePicker() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const from = searchParams.get("from") ?? ""
  const to = searchParams.get("to") ?? ""

  const updateRange = useCallback(
    (newFrom?: string, newTo?: string) => {
      const params = new URLSearchParams(searchParams.toString())

      if (newFrom) {
        params.set("from", newFrom)
      } else {
        params.delete("from")
      }

      if (newTo) {
        params.set("to", newTo)
      } else {
        params.delete("to")
      }

      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`)
      })
    },
    [router, pathname, searchParams]
  )

  const handlePreset = (days: number) => {
    const toDate = new Date()
    const fromDate = new Date()

    if (days === 0) {
      // Today
      const todayStr = toDate.toISOString().split("T")[0]
      updateRange(todayStr, todayStr)
      return
    }

    fromDate.setDate(toDate.getDate() - days + 1)
    const fromStr = fromDate.toISOString().split("T")[0]
    const toStr = toDate.toISOString().split("T")[0]
    updateRange(fromStr, toStr)
  }

  const handleReset = () => {
    updateRange(undefined, undefined)
  }

  return (
    <div className="w-full bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-slate-100 rounded-lg text-slate-700">
            <Calendar className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Time Machine Filter</h3>
            <p className="text-xs text-slate-500">Query attendance telemetry by specific date range</p>
          </div>
        </div>

        {/* Quick Presets */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => handlePreset(0)}
            className="px-3 py-1.5 text-xs font-semibold rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 transition-transform active:scale-[0.98]"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => handlePreset(7)}
            className="px-3 py-1.5 text-xs font-semibold rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 transition-transform active:scale-[0.98]"
          >
            Last 7 Days
          </button>
          <button
            type="button"
            onClick={() => handlePreset(30)}
            className="px-3 py-1.5 text-xs font-semibold rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 transition-transform active:scale-[0.98]"
          >
            Last 30 Days
          </button>

          {(from || to) && (
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-md bg-red-50 hover:bg-red-100 text-red-600 transition-transform active:scale-[0.98]"
            >
              <RefreshCw className="h-3 w-3" />
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Date Input Pickers */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-100">
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-600">From Date</label>
          <input
            type="date"
            value={from}
            disabled={isPending}
            onChange={(e) => updateRange(e.target.value, to)}
            className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-600">To Date</label>
          <input
            type="date"
            value={to}
            disabled={isPending}
            onChange={(e) => updateRange(from, e.target.value)}
            className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>
      </div>
    </div>
  )
}
