"use client"

import { useState, useTransition } from "react"
import { TableCell, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { upsertMark } from "@/app/actions/teacher"
import { Loader2, Lock } from "lucide-react"
import { toast } from "sonner"

interface MarkData {
  id: string
  studentId: string
  subjectId: string
  examType: string
  score: number
  maxScore: number
  status: "DRAFT" | "PUBLISHED"
  student: { user: { name: string | null } }
  subject: { name: string }
}

interface InlineMarkRowProps {
  mark: MarkData
  isSelected: boolean
  onToggleSelect: (id: string) => void
  activeSessionId: string
  isFinalized?: boolean
}

/**
 * Enterprise InlineMarkRow Component
 * - Accessible Read-Only State: When isFinalized=true, renders clean, copyable plain-text instead of greyed-out disabled form fields.
 * - Subtle Contextual Locking: Displays quiet Lock icon and neutral text.
 * - Guarded Server Action: Backed by strict server-side database finalization verification in upsertMark.
 */
export function InlineMarkRow({
  mark,
  isSelected,
  onToggleSelect,
  activeSessionId,
  isFinalized = false,
}: InlineMarkRowProps) {
  const [isPending, startTransition] = useTransition()

  // Local state for editable updates
  const [score, setScore] = useState(mark.score.toString())
  const [status, setStatus] = useState<"DRAFT" | "PUBLISHED">(mark.status)

  const handleSave = () => {
    if (isFinalized) return // Client guard

    const numScore = parseFloat(score)
    if (isNaN(numScore) || numScore < 0 || numScore > mark.maxScore) {
      toast.error(`Invalid score. Must be between 0 and ${mark.maxScore}`)
      setScore(mark.score.toString()) // revert
      return
    }

    if (numScore === mark.score && status === mark.status) {
      return
    }

    startTransition(async () => {
      const formData = new FormData()
      formData.append("studentId", mark.studentId)
      formData.append("subjectId", mark.subjectId)
      formData.append("examType", mark.examType)
      formData.append("score", numScore.toString())
      formData.append("status", status)
      formData.append("expectedSessionId", activeSessionId)

      const result = await upsertMark(formData)
      if (result.error) {
        toast.error(result.error)
        setScore(mark.score.toString())
        setStatus(mark.status)
      } else {
        toast.success("Mark updated successfully")
      }
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.currentTarget.blur()
      handleSave()
    } else if (e.key === "Escape") {
      setScore(mark.score.toString())
      e.currentTarget.blur()
    }
  }

  return (
    <TableRow className={`hover:bg-slate-100/60 ${isPending ? "opacity-50" : ""}`}>
      {/* Checkbox Column */}
      <TableCell className="w-[40px]">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelect(mark.id)}
          disabled={isFinalized}
          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600 disabled:opacity-40"
        />
      </TableCell>

      {/* Student Name */}
      <TableCell className="font-medium text-slate-900">
        {mark.student.user.name || "Unknown Student"}
      </TableCell>

      {/* Subject */}
      <TableCell className="text-slate-600">{mark.subject.name}</TableCell>

      {/* Exam Type */}
      <TableCell className="text-slate-600">{mark.examType}</TableCell>

      {/* Score Column — Dynamic Switch: Plain Text when Finalized (NO Disabled Input) vs Editable Input */}
      <TableCell className="text-right">
        {isFinalized ? (
          <div className="inline-flex items-center justify-end gap-1 font-mono text-xs select-text">
            <span className="font-semibold text-slate-900">{mark.score}</span>
            <span className="text-slate-400 font-normal">/ {mark.maxScore}</span>
          </div>
        ) : (
          <div className="inline-flex items-center justify-end gap-1.5">
            <Input
              type="number"
              value={score}
              onChange={(e) => setScore(e.target.value)}
              onBlur={handleSave}
              onKeyDown={handleKeyDown}
              disabled={isPending}
              className="h-8 w-20 text-right font-mono font-semibold text-xs border-slate-200"
              min={0}
              max={mark.maxScore}
            />
            <span className="text-xs font-mono text-slate-400">/ {mark.maxScore}</span>
          </div>
        )}
      </TableCell>

      {/* Status Column — Dynamic Switch: Subtle Lock Indicator when Finalized vs Editable Select */}
      <TableCell className="text-right">
        {isFinalized ? (
          <span className="inline-flex items-center justify-end gap-1.5 font-medium text-xs text-slate-500 select-text">
            <Lock className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
            <span>Finalized</span>
          </span>
        ) : (
          <Select
            value={status}
            onValueChange={(val) => {
              if (!val || isFinalized) return
              const newStatus = val as "DRAFT" | "PUBLISHED"
              setStatus(newStatus)
              startTransition(async () => {
                const formData = new FormData()
                formData.append("studentId", mark.studentId)
                formData.append("subjectId", mark.subjectId)
                formData.append("examType", mark.examType)
                formData.append("score", score)
                formData.append("status", newStatus)
                formData.append("expectedSessionId", activeSessionId)
                const result = await upsertMark(formData)
                if (result.error) {
                  toast.error(result.error)
                  setStatus(mark.status)
                } else {
                  toast.success(`Status updated to ${newStatus}`)
                }
              })
            }}
            disabled={isPending}
          >
            <SelectTrigger className="h-8 w-[110px] text-xs font-medium border-slate-200 bg-white ml-auto">
              <SelectValue>
                <span className="inline-flex items-center gap-1.5 font-medium text-xs text-slate-800">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      status === "PUBLISHED" ? "bg-emerald-500" : "bg-amber-500"
                    }`}
                  />
                  {status === "PUBLISHED" ? "Published" : "Draft"}
                </span>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DRAFT">
                <span className="inline-flex items-center gap-1.5 font-medium text-xs text-slate-800">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  Draft
                </span>
              </SelectItem>
              <SelectItem value="PUBLISHED">
                <span className="inline-flex items-center gap-1.5 font-medium text-xs text-slate-800">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Published
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
        )}
      </TableCell>

      {/* Action Spinner */}
      <TableCell className="text-right w-[40px]">
        {isPending && <Loader2 className="h-4 w-4 animate-spin text-slate-400 ml-auto" />}
      </TableCell>
    </TableRow>
  )
}
