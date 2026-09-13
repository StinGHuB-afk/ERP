"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * Enterprise Label Component
 * - Permanent, Persistent Label positioned above input fields
 * - Clear text-xs font-semibold text-slate-800 typography
 */
function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <label
      data-slot="label"
      className={cn(
        "block text-xs font-semibold text-slate-800 leading-none select-none peer-disabled:cursor-not-allowed peer-disabled:opacity-50 mb-1.5",
        className
      )}
      {...props}
    />
  )
}

export { Label }
