"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { assignSubstitute } from "@/app/actions/substitute.actions"
import { Button } from "@/components/ui/button"
import { UserCheck, AlertCircle, CheckCircle2, Loader2, Calendar, BookOpen, Clock } from "lucide-react"

interface TeacherOption {
  id: string
  name: string
  specialization?: string | null
}

interface ClassOption {
  id: string
  name: string
}

interface AssignSubstituteFormProps {
  teachers: TeacherOption[]
  classes: ClassOption[]
}

export function AssignSubstituteForm({ teachers, classes }: AssignSubstituteFormProps) {
  const [substituteTeacherId, setSubstituteTeacherId] = useState("")
  const [classId, setClassId] = useState("")
  const [validFrom, setValidFrom] = useState("")
  const [validUntil, setValidUntil] = useState("")

  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const router = useRouter()

  function resetForm() {
    setSubstituteTeacherId("")
    setClassId("")
    setValidFrom("")
    setValidUntil("")
    setError(null)
    setSuccessMsg(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!substituteTeacherId || !classId || !validFrom || !validUntil) {
      setError("Please fill out all fields: Teacher, Class, Start Time, and End Time.")
      return
    }

    const fromDate = new Date(validFrom)
    const untilDate = new Date(validUntil)

    if (fromDate >= untilDate) {
      setError("The Start Time must be earlier than the End Time.")
      return
    }

    setError(null)
    setSuccessMsg(null)

    startTransition(async () => {
      const res = await assignSubstitute({
        substituteTeacherId,
        classId,
        validFrom,
        validUntil,
      })

      if (res.success) {
        setSuccessMsg("Substitute teacher assignment created successfully!")
        resetForm()
        router.refresh()
      } else {
        setError(res.error || "Failed to create substitute assignment.")
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm text-xs">
      <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-2">
        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
          <UserCheck className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900">Assign Substitute Teacher</h3>
          <p className="text-[11px] text-slate-500">Temporarily delegate class access to a coverage teacher</p>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs font-medium flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
            <UserCheck className="h-3.5 w-3.5 text-slate-400" />
            Substitute Teacher <span className="text-rose-500">*</span>
          </label>
          <select
            required
            value={substituteTeacherId}
            onChange={(e) => setSubstituteTeacherId(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 bg-white"
          >
            <option value="">Select a substitute teacher...</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} {t.specialization ? `(${t.specialization})` : ""}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
            <BookOpen className="h-3.5 w-3.5 text-slate-400" />
            Target Class <span className="text-rose-500">*</span>
          </label>
          <select
            required
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 bg-white"
          >
            <option value="">Select class to cover...</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-slate-400" />
            Valid From <span className="text-rose-500">*</span>
          </label>
          <input
            type="datetime-local"
            required
            value={validFrom}
            onChange={(e) => setValidFrom(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800"
          />
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-slate-400" />
            Valid Until <span className="text-rose-500">*</span>
          </label>
          <input
            type="datetime-local"
            required
            value={validUntil}
            onChange={(e) => setValidUntil(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800"
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={resetForm}
          disabled={isPending}
          className="text-xs border-slate-200"
        >
          Reset
        </Button>
        <Button
          type="submit"
          disabled={isPending}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs gap-2"
        >
          {isPending ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Assigning...
            </>
          ) : (
            <>
              <UserCheck className="h-3.5 w-3.5" />
              Create Substitute Assignment
            </>
          )}
        </Button>
      </div>
    </form>
  )
}
