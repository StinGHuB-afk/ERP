"use client"

import { useState, useEffect, useTransition, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Table, TableBody, TableHead, TableHeader, TableRow, TableCell } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { bulkMarkPresent } from "@/app/actions/attendance"
import { AttendanceRow } from "./attendance-row"
import { getOfflineQueue, syncOfflineQueue } from "@/lib/offline-queue"
import { toast } from "sonner"
import { Loader2, CheckCircle2, WifiOff, RefreshCw } from "lucide-react"
import { Class, Student, User, Attendance } from "@prisma/client"

type StudentWithAttendance = Student & {
  user: User
  attendance: Attendance[]
}

type ClassWithStudents = Class & {
  students: StudentWithAttendance[]
}

export function TeacherAttendanceTable({
  classData,
  selectedDate,
  activeSessionId,
}: {
  classData: ClassWithStudents
  selectedDate: string
  activeSessionId: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [date, setDate] = useState(selectedDate)
  const [bulkUpdateTrigger, setBulkUpdateTrigger] = useState(0)

  // Offline Sync State
  const [isOffline, setIsOffline] = useState(false)
  const [queueCount, setQueueCount] = useState(0)
  const [isSyncing, setIsSyncing] = useState(false)

  const checkOfflineState = useCallback(() => {
    if (typeof window === "undefined") return
    setIsOffline(!navigator.onLine)
    const q = getOfflineQueue()
    setQueueCount(q.length)
  }, [])

  const triggerSync = useCallback(async () => {
    if (typeof window === "undefined" || !navigator.onLine) return
    const q = getOfflineQueue()
    if (q.length === 0) return

    setIsSyncing(true)
    toast.info(`Connecting... Syncing ${q.length} queued attendance update(s).`)

    try {
      const { syncedCount, remainingCount } = await syncOfflineQueue()
      setQueueCount(remainingCount)
      if (syncedCount > 0) {
        toast.success(`Successfully synced ${syncedCount} offline record(s)!`)
        router.refresh()
      }
    } catch (err) {
      console.error("Sync failed:", err)
      toast.error("Failed to sync offline items. Will retry automatically.")
    } finally {
      setIsSyncing(false)
    }
  }, [router])

  // Attach online/offline event listeners
  useEffect(() => {
    checkOfflineState()

    const handleOnline = () => {
      setIsOffline(false)
      triggerSync()
    }

    const handleOffline = () => {
      setIsOffline(true)
      checkOfflineState()
    }

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [checkOfflineState, triggerSync])

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value
    setDate(newDate)
    startTransition(() => router.push(`/teacher/attendance?date=${newDate}`))
  }

  const handleMarkAllPresent = () => {
    const studentIds = classData.students.map((s) => s.id)
    setBulkUpdateTrigger((prev) => prev + 1)
    startTransition(async () => {
      const res = await bulkMarkPresent(classData.id, date, studentIds, activeSessionId)
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success(`Marked all present for ${classData.name}`)
        router.refresh()
      }
    })
  }

  const attendanceCount = classData.students.filter((s) => s.attendance.length > 0).length

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-slate-800">{classData.name}</h2>

            {/* Offline & Sync Visual Badges */}
            {isSyncing && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold animate-pulse">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Syncing...
              </span>
            )}

            {!isSyncing && (isOffline || queueCount > 0) && (
              <button
                onClick={triggerSync}
                disabled={isOffline || isSyncing}
                title={isOffline ? "You are offline" : "Click to sync offline changes"}
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold hover:bg-amber-100 transition-colors cursor-pointer"
              >
                {isOffline ? (
                  <WifiOff className="h-3.5 w-3.5 text-amber-600" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5 text-amber-600" />
                )}
                <span>
                  {isOffline ? "Offline" : "Sync Pending"} ({queueCount} saved locally)
                </span>
              </button>
            )}
          </div>
          <p className="text-sm text-slate-500">
            {classData.students.length} Students | {attendanceCount} Marked Today
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Input
            type="date"
            value={date}
            onChange={handleDateChange}
            className="w-[160px] bg-white font-mono"
            disabled={isPending}
          />
          <Button
            onClick={handleMarkAllPresent}
            disabled={isPending || classData.students.length === 0}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4 mr-2" />
            )}{" "}
            Mark All Present
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-slate-50/50">
            <TableRow>
              <TableHead className="w-[320px]">Student Roster</TableHead>
              <TableHead>Attendance Status</TableHead>
              <TableHead className="w-[300px]">Remarks</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {classData.students.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-8 text-slate-500">
                  No students assigned to this class.
                </TableCell>
              </TableRow>
            ) : (
              classData.students.map((student) => (
                <AttendanceRow
                  key={`${student.id}-${student.attendance[0]?.status || 'none'}-${student.attendance[0]?.remarks || ''}`}
                  student={student}
                  classId={classData.id}
                  date={date}
                  activeSessionId={activeSessionId}
                  onOfflineStateChange={checkOfflineState}
                  bulkUpdateTrigger={bulkUpdateTrigger}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
