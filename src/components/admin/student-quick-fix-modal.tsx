"use client"

import { useState, useTransition } from "react"
import { updateStudentQuickFix } from "@/app/actions/onboarding"
import { toast } from "sonner"
import { Wrench, Loader2, X, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface StudentQuickFixModalProps {
  student: {
    id: string
    rollNumber: string | null
    classId: string | null
    user: {
      id: string
      name: string | null
      email: string
    }
  }
  classes: Array<{ id: string; name: string }>
}

export function StudentQuickFixModal({ student, classes }: StudentQuickFixModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [form, setForm] = useState({
    name: student.user.name || "",
    email: student.user.email || "",
    rollNumber: student.rollNumber || "",
    classId: student.classId || "",
  })

  const handleOpen = () => {
    setForm({
      name: student.user.name || "",
      email: student.user.email || "",
      rollNumber: student.rollNumber || "",
      classId: student.classId || "",
    })
    setIsOpen(true)
  }

  const handleSave = () => {
    startTransition(async () => {
      const res = await updateStudentQuickFix(student.id, {
        name: form.name.trim(),
        email: form.email.trim(),
        rollNumber: form.rollNumber.trim() || null,
        classId: form.classId ? form.classId : null,
      })

      if (res.error) {
        toast.error(res.error)
        return
      }

      toast.success("Student details updated and anomalies resolved.")
      setIsOpen(false)
    })
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handleOpen}
        className="h-7 px-2 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border-amber-300 gap-1"
        title="Resolve anomalies for this student"
      >
        <Wrench className="h-3 w-3" />
        Fix
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 text-left">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Resolve Student Details</h4>
                <p className="text-[11px] text-slate-500">Fix class assignments, roll numbers, or contact info</p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600 rounded-md p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Student Full Name</label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Student name"
                  className="h-8 text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Login Email</label>
                <Input
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="student@school.edu"
                  className="h-8 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Unique ID / Roll No</label>
                  <Input
                    value={form.rollNumber}
                    onChange={(e) => setForm({ ...form, rollNumber: e.target.value })}
                    placeholder="e.g. STU-1001"
                    className="h-8 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Assigned Class</label>
                  <select
                    value={form.classId}
                    onChange={(e) => setForm({ ...form, classId: e.target.value })}
                    className="w-full h-8 px-2 border rounded-md text-xs bg-white text-slate-800"
                  >
                    <option value="">Unassigned</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsOpen(false)}
                disabled={isPending}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    Save &amp; Resolve
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
