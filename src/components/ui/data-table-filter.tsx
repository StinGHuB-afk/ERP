"use client"

import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useTransition } from "react"

interface DataTableFilterProps {
  paramKey: string
  title: string
  allLabel?: string
  options: { label: string; value: string }[]
}

export function DataTableFilter({ paramKey, title, allLabel, options }: DataTableFilterProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  // Format default all label (e.g. "Class" -> "All Classes")
  const defaultAllText =
    allLabel ||
    (title === "Class"
      ? "All Classes"
      : title.endsWith("es") || title.endsWith("s")
      ? `All ${title}`
      : title.endsWith("y")
      ? `All ${title.slice(0, -1)}ies`
      : title.endsWith("ch") || title.endsWith("sh") || title.endsWith("x")
      ? `All ${title}es`
      : `All ${title}s`)

  const formattedAllLabel = defaultAllText

  const currentValue = searchParams.get(paramKey) || "all"
  const selectedOption = options.find((opt) => opt.value === currentValue)
  const displayLabel = currentValue === "all" || !currentValue ? formattedAllLabel : selectedOption?.label || currentValue

  const handleValueChange = (value: string | null) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString())
      if (value && value !== "all" && value !== "") {
        params.set(paramKey, value)
      } else {
        // Remove parameter entirely when "All Classes" / "all" is selected
        params.delete(paramKey)
      }
      params.set("page", "1")
      router.push(`${pathname}?${params.toString()}`)
    })
  }

  return (
    <div className={`flex items-center gap-2 ${isPending ? 'opacity-70' : ''}`}>
      <Select value={currentValue} onValueChange={handleValueChange}>
        <SelectTrigger className="w-[180px] shadow-sm bg-white">
          <SelectValue placeholder={title}>{displayLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{formattedAllLabel}</SelectItem>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
