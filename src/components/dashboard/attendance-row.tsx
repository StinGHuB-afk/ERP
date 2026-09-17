"use client"

import { useOptimistic, useState, useTransition, useEffect } from "react"
import { upsertAttendance, UpsertAttendanceInput } from "@/app/actions/attendance"
import { addToOfflineQueue } from "@/lib/offline-queue"
import { TableRow, TableCell } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { WifiOff } from "lucide-react"

export interface StudentWithAttendanceRecord {
  id: string
  user: {
    name: string | null
    email?: string
  }
  attendance: {
    status: string
    remarks: string | null
  }[]
}

interface AttendanceRowProps {
  student: StudentWithAttendanceRecord
  classId: string
  date: string
  activeSessionId: string
  onOfflineStateChange?: () => void
  bulkUpdateTrigger?: number
}

type AttendanceStatusType = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED"

export function AttendanceRow({
  student,
  classId,
  date,
  activeSessionId,
  onOfflineStateChange,
  bulkUpdateTrigger,
}: AttendanceRowProps) {
  const currentRecord = student.attendance[0]

  const [realState, setRealState] = useState<{
    status: AttendanceStatusType
    remarks: string
  }>({
    status: (currentRecord?.status as AttendanceStatusType) || "PRESENT",
    remarks: currentRecord?.remarks || "",
  })

  // Synchronize local realState during render whenever incoming server props update
  const [prevStatus, setPrevStatus] = useState(currentRecord?.status)
  const [prevRemarks, setPrevRemarks] = useState(currentRecord?.remarks)

  if (currentRecord?.status !== prevStatus || currentRecord?.remarks !== prevRemarks) {
    setPrevStatus(currentRecord?.status)
    setPrevRemarks(currentRecord?.remarks)
    setRealState({
      status: (currentRecord?.status as AttendanceStatusType) || "PRESENT",
      remarks: currentRecord?.remarks || "",
    })
  }

  // React 19 useOptimistic hook for instant feedback
  const [optimisticState, setOptimisticState] = useOptimistic(
    realState,
    (current, update: Partial<typeof realState>) => ({
      ...current,
      ...update,
    })
  )

  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (bulkUpdateTrigger && bulkUpdateTrigger > 0) {
      startTransition(() => {
        setOptimisticState({ status: "PRESENT", remarks: "" })
      })
    }
  }, [bulkUpdateTrigger, setOptimisticState])

  const handleUpdate = (
    newStatus = optimisticState.status,
    newRemarks = optimisticState.remarks
  ) => {
    const payload: UpsertAttendanceInput = {
      studentId: student.id,
      classId,
      date,
      status: newStatus,
      sessionId: activeSessionId,
      expectedSessionId: activeSessionId,
      remarks: newRemarks,
    }

    startTransition(async () => {
      // 1. Immediately apply optimistic UI update before server action finishes
      setOptimisticState({ status: newStatus, remarks: newRemarks })

      // 2. Check offline state & wrap server action call in try/catch
      if (typeof window !== "undefined" && !navigator.onLine) {
        addToOfflineQueue(payload)
        toast.info("Offline: Attendance saved locally", {
          icon: <WifiOff className="h-4 w-4 text-amber-500" />,
        })
        setRealState({ status: newStatus, remarks: newRemarks })
        if (onOfflineStateChange) onOfflineStateChange()
        return
      }

      try {
        const res = await upsertAttendance(payload)
        if (res.error) {
          toast.error(res.error)
          // Revert optimistic update on server validation error
          setOptimisticState(realState)
        } else {
          toast.success("Attendance saved")
          setRealState({ status: newStatus, remarks: newRemarks })
        }
      } catch (err) {
        console.warn("Network error during attendance submission. Saving to offline queue:", err)
        addToOfflineQueue(payload)
        toast.warning("Network connection lost. Saved to offline queue.")
        setRealState({ status: newStatus, remarks: newRemarks })
        if (onOfflineStateChange) onOfflineStateChange()
      }
    })
  }

  return (
    <TableRow className={`transition-all duration-200 ${isPending ? "opacity-85" : ""}`}>
      <TableCell className="font-medium text-slate-900">
        {student.user.name || "Unknown Student"}
      </TableCell>

      <TableCell>
        <div className="flex items-center gap-1.5">
          {(["PRESENT", "ABSENT", "LATE", "EXCUSED"] as const).map((s) => {
            const isActive = optimisticState.status === s
            let tactileStyle = ""

            if (isActive) {
              if (s === "PRESENT") {
                // Tactile Emerald border glow and text color change
                tactileStyle =
                  "bg-emerald-600 text-white font-bold shadow-[0_0_12px_rgba(16,185,129,0.35)] ring-2 ring-emerald-500/50 scale-[1.02]"
              } else if (s === "ABSENT") {
                tactileStyle =
                  "bg-red-600 text-white font-bold shadow-[0_0_12px_rgba(239,68,68,0.35)] ring-2 ring-red-500/50 scale-[1.02]"
              } else if (s === "LATE") {
                tactileStyle =
                  "bg-amber-500 text-white font-bold shadow-[0_0_12px_rgba(245,158,11,0.35)] ring-2 ring-amber-400/50 scale-[1.02]"
              } else {
                tactileStyle =
                  "bg-blue-600 text-white font-bold shadow-[0_0_12px_rgba(37,99,235,0.35)] ring-2 ring-blue-500/50 scale-[1.02]"
              }
            } else {
              tactileStyle =
                "bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200 hover:border-slate-300 font-medium"
            }

            return (
              <button
                key={s}
                type="button"
                onClick={() => handleUpdate(s, optimisticState.remarks)}
                className={`px-3 py-1.5 text-xs rounded-md transition-all duration-150 cursor-pointer active:scale-95 ${tactileStyle}`}
              >
                {s}
              </button>
            )
          })}
        </div>
      </TableCell>

      <TableCell>
        <Input
          value={optimisticState.remarks}
          onChange={(e) => {
            startTransition(() => {
              setOptimisticState({ remarks: e.target.value })
            })
          }}
          onBlur={() => handleUpdate(optimisticState.status, optimisticState.remarks)}
          placeholder="Optional remarks..."
          className="h-8 text-xs bg-white border-slate-200 focus:border-slate-400 font-normal"
        />
      </TableCell>
    </TableRow>
  )
}
