"use client"

import { useState, useTransition } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { InlineMarkRow } from "./inline-mark-row"
import { bulkUpdateMarkStatus } from "@/app/actions/teacher"
import { toast } from "sonner"
import { Loader2, CheckCircle, Clock } from "lucide-react"

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

export function TeacherMarksTable({ marks, activeSessionId }: { marks: MarkData[]; activeSessionId: string }) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isPending, startTransition] = useTransition()

  const handleToggleSelectAll = () => {
    if (selectedIds.size === marks.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(marks.map((m) => m.id)))
    }
  }

  const handleToggleSelect = (id: string) => {
    const newSet = new Set(selectedIds)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setSelectedIds(newSet)
  }

  const handleBulkAction = (status: "PUBLISHED" | "DRAFT") => {
    if (selectedIds.size === 0) return

    startTransition(async () => {
      const idsArray = Array.from(selectedIds)
      const result = await bulkUpdateMarkStatus(idsArray, status)

      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(`Successfully updated ${idsArray.length} marks to ${status}`)
        setSelectedIds(new Set())
      }
    })
  }

  return (
    <div className="space-y-4">
      {/* Bulk Action Toolbar */}
      {selectedIds.size > 0 && (
        <div className="bg-slate-100 border border-slate-200 p-3 rounded-lg flex items-center justify-between">
          <span className="text-xs font-medium text-slate-800 font-mono">
            {selectedIds.size} row(s) selected
          </span>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="bg-white hover:bg-slate-50 text-slate-700 border-slate-200 text-xs font-medium h-8"
              onClick={() => handleBulkAction("DRAFT")}
              disabled={isPending}
            >
              {isPending ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Clock className="h-3.5 w-3.5 mr-1.5 text-amber-500" />}
              Set to Draft
            </Button>
            <Button
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium h-8"
              onClick={() => handleBulkAction("PUBLISHED")}
              disabled={isPending}
            >
              {isPending ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5 mr-1.5 text-emerald-400" />}
              Publish Selected
            </Button>
          </div>
        </div>
      )}

      {/* Clean Data Table Surface — Row-only borders, no vertical borders or zebra striping */}
      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]">
                <input
                  type="checkbox"
                  checked={marks.length > 0 && selectedIds.size === marks.length}
                  onChange={handleToggleSelectAll}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
                />
              </TableHead>
              <TableHead>Student</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Exam Type</TableHead>
              <TableHead className="text-right">Score</TableHead>
              <TableHead className="text-right">Status</TableHead>
              <TableHead className="w-[40px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {marks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-slate-500 text-xs">
                  No marks recorded. Use the form above to add student marks.
                </TableCell>
              </TableRow>
            ) : (
              marks.map((mark) => (
                <InlineMarkRow
                  key={mark.id}
                  mark={mark}
                  isSelected={selectedIds.has(mark.id)}
                  onToggleSelect={handleToggleSelect}
                  activeSessionId={activeSessionId}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
