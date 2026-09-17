"use client"

import { useState, useSyncExternalStore } from "react"
import { Calendar, ChevronLeft, ChevronRight, Info } from "lucide-react"

const emptySubscribe = () => () => {}
function useIsMounted() {
  return useSyncExternalStore(emptySubscribe, () => true, () => false)
}

export interface HeatmapDay {
  date: string // YYYY-MM-DD
  attendancePct: number | null // null if no class held
  totalStudents?: number
  presentCount?: number
  absentCount?: number
}

interface AttendanceHeatmapProps {
  data?: HeatmapDay[]
  title?: string
  subtitle?: string
}

/**
 * Generate simulated heat map data for demo if not provided
 */
function generateDefaultHeatmapData(): HeatmapDay[] {
  const days: HeatmapDay[] = []
  // Use a fixed anchor date or current date deterministically
  const today = new Date()
  // Generate last 16 weeks (112 days)
  for (let i = 111; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const dayOfWeek = d.getDay()
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
    
    const dateStr = d.toISOString().split("T")[0]

    if (isWeekend) {
      days.push({ date: dateStr, attendancePct: null })
    } else {
      // Generate realistic deterministic score between 70% and 100%
      const pseudoRandom = Math.sin(i * 12.9898) * 0.5 + 0.5
      const basePct = 85 + Math.sin(i * 0.3) * 12 + (pseudoRandom * 6 - 3)
      const pct = Math.min(100, Math.max(65, Math.round(basePct)))
      const total = 32
      const present = Math.round((pct / 100) * total)
      const absent = total - present
      days.push({
        date: dateStr,
        attendancePct: pct,
        totalStudents: total,
        presentCount: present,
        absentCount: absent,
      })
    }
  }
  return days
}

export function AttendanceHeatmap({
  data,
  title = "Semester Attendance Heatmap",
  subtitle = "Daily attendance density and percentage breakdown across active term",
}: AttendanceHeatmapProps) {
  const isMounted = useIsMounted()

  // Use provided data or fallback to empty array on server / pre-mount to ensure SSR hydration match
  const heatmapData = data && data.length > 0 
    ? data 
    : isMounted 
    ? generateDefaultHeatmapData() 
    : []
  const [hoveredDay, setHoveredDay] = useState<HeatmapDay | null>(null)
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null)

  // Aggregated Stats
  const activeDays = heatmapData.filter((d) => d.attendancePct !== null)
  const avgAttendance = activeDays.length > 0
    ? Math.round(activeDays.reduce((acc, d) => acc + (d.attendancePct || 0), 0) / activeDays.length)
    : 0

  const highDays = activeDays.filter((d) => (d.attendancePct || 0) >= 95).length
  const warningDays = activeDays.filter((d) => (d.attendancePct || 0) < 75).length

  // Color intensity scale based on attendance percentage
  const getCellColor = (pct: number | null) => {
    if (pct === null) return "bg-slate-100/80 border-slate-200/50" // Weekend / No class
    if (pct >= 95) return "bg-emerald-500 border-emerald-600 shadow-[0_0_8px_rgba(16,185,129,0.25)]"
    if (pct >= 88) return "bg-emerald-400 border-emerald-500"
    if (pct >= 80) return "bg-blue-400 border-blue-500"
    if (pct >= 75) return "bg-amber-400 border-amber-500"
    return "bg-rose-500 border-rose-600 shadow-[0_0_8px_rgba(244,63,94,0.25)] animate-pulse"
  }

  // Group into weeks (column-based GitHub matrix layout)
  const weeks: HeatmapDay[][] = []
  let currentWeek: HeatmapDay[] = []

  heatmapData.forEach((day, index) => {
    currentWeek.push(day)
    if (currentWeek.length === 7 || index === heatmapData.length - 1) {
      weeks.push(currentWeek)
      currentWeek = []
    }
  })

  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

  const handleMouseEnter = (day: HeatmapDay, e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setHoveredDay(day)
    setTooltipPos({
      x: rect.left + rect.width / 2,
      y: rect.top - 8,
    })
  }

  const handleMouseLeave = () => {
    setHoveredDay(null)
    setTooltipPos(null)
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
        </div>

        {/* Quick Summary Badges */}
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-md">
            <span className="text-slate-500">Term Avg:</span>
            <span className="font-semibold font-mono text-slate-900">{avgAttendance}%</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-md">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>95%+ Days: <strong className="font-mono">{highDays}</strong></span>
          </div>
          {warningDays > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-rose-50 border border-rose-200 text-rose-700 rounded-md animate-pulse">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span>&lt;75% Alert: <strong className="font-mono">{warningDays}</strong></span>
            </div>
          )}
        </div>
      </div>

      {/* Heatmap Matrix Grid */}
      <div className="relative overflow-x-auto pb-2">
        <div className="inline-flex gap-1.5 items-start">
          {/* Day of Week Labels */}
          <div className="grid grid-rows-7 gap-1.5 text-[10px] font-semibold text-slate-400 pr-2 pt-0.5 select-none">
            {dayLabels.map((lbl, idx) => (
              <span key={lbl} className={`h-3.5 flex items-center ${idx === 0 || idx === 6 ? 'opacity-40' : ''}`}>
                {lbl[0]}
              </span>
            ))}
          </div>

          {/* Weeks Columns */}
          <div className="flex gap-1.5">
            {weeks.map((week, wIdx) => (
              <div key={wIdx} className="grid grid-rows-7 gap-1.5">
                {week.map((day) => (
                  <div
                    key={day.date}
                    onMouseEnter={(e) => handleMouseEnter(day, e)}
                    onMouseLeave={handleMouseLeave}
                    className={`w-3.5 h-3.5 rounded-[3px] border transition-all duration-150 cursor-pointer hover:scale-125 hover:z-10 ${getCellColor(
                      day.attendancePct
                    )}`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-between mt-5 pt-4 border-t border-slate-100 text-xs text-slate-500">
          <div className="flex items-center gap-1.5 text-[11px]">
            <Info className="h-3.5 w-3.5 text-slate-400" />
            <span>Hover over any day cell to inspect detailed attendance telemetry</span>
          </div>

          <div className="flex items-center gap-2 text-[11px]">
            <span>Less</span>
            <div className="flex gap-1">
              <span className="w-3 h-3 rounded-[2px] bg-rose-500 border border-rose-600" />
              <span className="w-3 h-3 rounded-[2px] bg-amber-400 border border-amber-500" />
              <span className="w-3 h-3 rounded-[2px] bg-blue-400 border border-blue-500" />
              <span className="w-3 h-3 rounded-[2px] bg-emerald-400 border border-emerald-500" />
              <span className="w-3 h-3 rounded-[2px] bg-emerald-500 border border-emerald-600" />
            </div>
            <span>More (&gt;95%)</span>
          </div>
        </div>
      </div>

      {/* Sleek Dynamic Hover Tooltip */}
      {hoveredDay && tooltipPos && (
        <div
          style={{
            position: "fixed",
            left: `${tooltipPos.x}px`,
            top: `${tooltipPos.y}px`,
            transform: "translate(-50%, -100%)",
          }}
          className="z-50 pointer-events-none bg-slate-900 text-white text-xs rounded-lg px-3 py-2 shadow-xl border border-slate-800 animate-in fade-in zoom-in-95 duration-100"
        >
          <div className="font-semibold font-mono text-slate-200 border-b border-slate-800 pb-1 mb-1">
            {new Date(hoveredDay.date).toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </div>
          {hoveredDay.attendancePct !== null ? (
            <div className="space-y-0.5">
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-400">Attendance:</span>
                <span className="font-bold font-mono text-emerald-400">{hoveredDay.attendancePct}%</span>
              </div>
              {hoveredDay.presentCount !== undefined && (
                <div className="flex items-center justify-between gap-4 text-[11px]">
                  <span className="text-slate-400">Present / Total:</span>
                  <span className="font-mono text-slate-200">
                    {hoveredDay.presentCount} / {hoveredDay.totalStudents}
                  </span>
                </div>
              )}
              {hoveredDay.absentCount !== undefined && hoveredDay.absentCount > 0 && (
                <div className="flex items-center justify-between gap-4 text-[11px]">
                  <span className="text-rose-400">Absentees:</span>
                  <span className="font-mono text-rose-400">{hoveredDay.absentCount}</span>
                </div>
              )}
            </div>
          ) : (
            <span className="text-slate-400 italic">No class held (Weekend/Holiday)</span>
          )}
        </div>
      )}
    </div>
  )
}
