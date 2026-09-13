import React from "react"
import { LucideIcon } from "lucide-react"

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: LucideIcon
}

/**
 * Enterprise StatCard Component
 * - Pure White Surface (bg-white border border-slate-200)
 * - Bare Icon (no squircle, colored box, or rounded container)
 * - Typography-driven hierarchy (Primary value: text-2xl font-semibold text-slate-900)
 * - Zero gradients, glassmorphism, or hover scaling
 */
export function StatCard({ title, value, subtitle, icon: Icon }: StatCardProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col justify-between">
      <div className="flex items-center justify-between text-slate-500 mb-2">
        <span className="text-sm font-medium text-slate-500">{title}</span>
        <Icon className="h-4 w-4 text-slate-400" />
      </div>
      <div>
        <div className="text-2xl font-semibold text-slate-900 tracking-tight">{value}</div>
        {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
      </div>
    </div>
  )
}
