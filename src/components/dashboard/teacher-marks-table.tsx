"use client"

import { useState, useTransition } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { upsertMark, bulkUpdateMarkStatus } from "@/app/actions/teacher"
import { toast } from "sonner"
import { Loader2, CheckCircle, Clock } from "lucide-react"

interface MarkData {
  id: string
  studentId: string
  subjectId: string
  examType: string
  score: number | null
  maxScore: number
  status: string
  student: { user: { name: string | null } }
  subject: { name: string }
}

export function TeacherMarksTable({ marks, activeSessionId }: { marks: MarkData[]; activeSessionId: string }) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isPending, startTransition] = useTransition()

  const handleToggleAll = () => {
    setSelectedIds(selectedIds.size === marks.length ? new Set() : new Set(marks.map((m) => m.id)))
  }

  const handleToggleSelect = (id: string) => {
    const next = new Set(selectedIds)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    setSelectedIds(next)
  }

  const handleBulkAction = (status: "PUBLISHED" | "DRAFT") => {
    if (selectedIds.size === 0) return
    startTransition(async () => {
      const ids = Array.from(selectedIds)
      const res = await bulkUpdateMarkStatus(ids, status)
      if (res.error) toast.error(res.error)
      else {
        toast.success(`Updated ${ids.length} marks to ${status}`)
        setSelectedIds(new Set())
      }
    })
  }

  return (
    <div className="space-y-4">
      {selectedIds.size > 0 && (
        <div className="bg-slate-100 border border-slate-200 p-3 rounded-lg flex items-center justify-between">
          <span className="text-xs font-medium text-slate-800 font-mono">{selectedIds.size} row(s) selected</span>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="bg-white text-xs h-8" onClick={() => handleBulkAction("DRAFT")} disabled={isPending}>
              {isPending ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Clock className="h-3.5 w-3.5 mr-1.5 text-amber-500" />} Set to Draft
            </Button>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8" onClick={() => handleBulkAction("PUBLISHED")} disabled={isPending}>
              {isPending ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5 mr-1.5 text-emerald-400" />} Publish Selected
            </Button>
          </div>
        </div>
      )}

      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]">
                <input type="checkbox" checked={marks.length > 0 && selectedIds.size === marks.length} onChange={handleToggleAll} className="w-4 h-4 rounded border-slate-300 text-blue-600" />
              </TableHead>
              <TableHead>Student</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Exam Type</TableHead>
              <TableHead className="text-right">Score</TableHead>
              <TableHead className="text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {marks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-slate-500 text-xs">No marks recorded.</TableCell>
              </TableRow>
            ) : (
              marks.map((mark) => (
                <InlineMarkRow key={mark.id} mark={mark} isSelected={selectedIds.has(mark.id)} onToggle={() => handleToggleSelect(mark.id)} activeSessionId={activeSessionId} />
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

function InlineMarkRow({ mark, isSelected, onToggle, activeSessionId }: { mark: MarkData; isSelected: boolean; onToggle: () => void; activeSessionId: string }) {
  const [isPending, startTransition] = useTransition()
  const [score, setScore] = useState((mark.score ?? "").toString())
  const [status, setStatus] = useState(mark.status)

  const saveMark = (newStatus = status, newScore = score) => {
    const num = parseFloat(newScore)
    if (isNaN(num) || num < 0 || num > mark.maxScore) {
      toast.error(`Invalid score (0-${mark.maxScore})`)
      setScore((mark.score ?? "").toString())
      return
    }
    if (num === mark.score && newStatus === mark.status) return

    startTransition(async () => {
      const formData = new FormData()
      formData.append("studentId", mark.studentId)
      formData.append("subjectId", mark.subjectId)
      formData.append("examType", mark.examType)
      formData.append("score", num.toString())
      formData.append("status", newStatus)
      formData.append("expectedSessionId", activeSessionId)

      const res = await upsertMark(formData)
      if (res.error) {
        toast.error(res.error)
        setScore((mark.score ?? "").toString())
        setStatus(mark.status)
      } else {
        toast.success("Mark updated")
      }
    })
  }

  return (
    <TableRow className={`hover:bg-slate-50 ${isPending ? "opacity-50" : ""}`}>
      <TableCell className="w-[40px]">
        <input type="checkbox" checked={isSelected} onChange={onToggle} className="w-4 h-4 rounded border-slate-300 text-blue-600" />
      </TableCell>
      <TableCell className="font-medium text-slate-900">{mark.student.user.name || "Unknown Student"}</TableCell>
      <TableCell className="text-slate-600">{mark.subject.name}</TableCell>
      <TableCell className="text-slate-600">{mark.examType}</TableCell>
      <TableCell className="text-right">
        <div className="inline-flex items-center justify-end gap-1.5">
          <Input
            type="number"
            value={score}
            onChange={(e) => setScore(e.target.value)}
            onBlur={() => saveMark()}
            disabled={isPending}
            className="h-8 w-20 text-right font-mono font-semibold text-xs border-slate-200"
          />
          <span className="text-xs font-mono text-slate-400">/ {mark.maxScore}</span>
        </div>
      </TableCell>
      <TableCell className="text-right">
        <Select
          value={status}
          onValueChange={(val) => {
            const next = val as "DRAFT" | "PUBLISHED"
            setStatus(next)
            saveMark(next, score)
          }}
          disabled={isPending}
        >
          <SelectTrigger className="h-8 w-[110px] text-xs font-medium border-slate-200 bg-white ml-auto">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="PUBLISHED">Published</SelectItem>
          </SelectContent>
        </Select>
      </TableCell>
    </TableRow>
  )
}
