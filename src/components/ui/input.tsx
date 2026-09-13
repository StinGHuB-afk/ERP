import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * Enterprise Solid Input Component
 * - Solid White Background (bg-white)
 * - Crisp, Accessible Border (border-slate-300)
 * - Solid Focus Ring (focus:border-blue-600 focus:ring-1 focus:ring-blue-600)
 * - Zero Glassmorphism or Semi-transparent Layers
 */
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-9 w-full min-w-0 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 shadow-subtle placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 disabled:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-500 aria-invalid:border-red-600 aria-invalid:ring-1 aria-invalid:ring-red-600 transition-colors",
        className
      )}
      {...props}
    />
  )
}

export { Input }
