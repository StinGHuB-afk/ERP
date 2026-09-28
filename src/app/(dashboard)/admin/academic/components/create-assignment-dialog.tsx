"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { createAssignment } from "@/app/actions/academic.actions"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Plus } from "lucide-react"
import { ClassOption, SubjectOption, TeacherOption } from "./schedule-class-dialog"

interface CreateAssignmentDialogProps {
  classes: ClassOption[]
  subjects: SubjectOption[]
  teachers: TeacherOption[]
}

const formSchema = z.object({
  title: z.string().min(2, "Assignment title is required"),
  description: z.string().optional(),
  classId: z.string().min(1, "Class is required"),
  subjectId: z.string().min(1, "Subject is required"),
  teacherId: z.string().optional(),
  dueDate: z.string().min(1, "Due date is required"),
  maxMarks: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

export function CreateAssignmentDialog({
  classes,
  subjects,
  teachers,
}: CreateAssignmentDialogProps) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      classId: classes[0]?.id || "",
      subjectId: subjects[0]?.id || "",
      teacherId: teachers[0]?.id || "",
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      maxMarks: "100",
    },
  })

  const onSubmit = (data: FormValues) => {
    setError(null)
    startTransition(async () => {
      try {
        const parsedMaxMarks = data.maxMarks && data.maxMarks.trim() !== "" ? Number(data.maxMarks) : undefined
        if (parsedMaxMarks !== undefined && (isNaN(parsedMaxMarks) || parsedMaxMarks <= 0)) {
          setError("Max marks must be a positive number.")
          return
        }

        await createAssignment({
          title: data.title,
          description: data.description || undefined,
          classId: data.classId,
          subjectId: data.subjectId,
          teacherId: data.teacherId || undefined,
          dueDate: new Date(data.dueDate),
          maxMarks: parsedMaxMarks,
        })
        reset()
        setOpen(false)
        router.refresh()
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message)
        } else {
          setError("Failed to create assignment.")
        }
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" variant="outline" className="gap-1.5">
            <Plus className="h-4 w-4" />
            <span>Create Assignment</span>
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Create Coursework Assignment</DialogTitle>
          <DialogDescription>
            Publish a new assignment for a class with due date and maximum marks.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          {error && (
            <div className="rounded-md border border-red-500/20 bg-red-500/10 p-2.5 text-xs text-red-600">
              {error}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700">Assignment Title</label>
            <input
              type="text"
              placeholder="e.g. Chapter 4 Calculus Homework, Lab Report #2"
              {...register("title")}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
            {errors.title && (
              <p className="text-[10px] text-red-500">{errors.title.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700">Description / Instructions</label>
            <textarea
              rows={3}
              placeholder="Provide assignment guidelines or submission criteria..."
              {...register("description")}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">Class</label>
              <select
                {...register("classId")}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              >
                <option value="">Select Class...</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    Class {c.name}
                  </option>
                ))}
              </select>
              {errors.classId && (
                <p className="text-[10px] text-red-500">{errors.classId.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">Subject</label>
              <select
                {...register("subjectId")}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              >
                <option value="">Select Subject...</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              {errors.subjectId && (
                <p className="text-[10px] text-red-500">{errors.subjectId.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700">Assigned Teacher (Optional)</label>
            <select
              {...register("teacherId")}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
              <option value="">Default to current user / subject teacher</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.user?.name || "Teacher"} ({t.user?.email || "No email"})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">Due Date</label>
              <input
                type="date"
                {...register("dueDate")}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
              {errors.dueDate && (
                <p className="text-[10px] text-red-500">{errors.dueDate.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">Max Marks (Optional)</label>
              <input
                type="number"
                placeholder="100"
                {...register("maxMarks")}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isPending}>
              {isPending ? "Creating..." : "Create Assignment"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
