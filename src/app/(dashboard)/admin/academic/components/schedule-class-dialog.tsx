"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { DayOfWeek } from "@prisma/client"
import { createTimetablePeriod } from "@/app/actions/academic.actions"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Plus, AlertCircle } from "lucide-react"

export interface ClassOption {
  id: string
  name: string
}

export interface SubjectOption {
  id: string
  name: string
  code?: string | null
}

export interface TeacherOption {
  id: string
  user?: { name: string | null; email: string | null } | null
}

interface ScheduleClassDialogProps {
  classes: ClassOption[]
  subjects: SubjectOption[]
  teachers: TeacherOption[]
}

const formSchema = z
  .object({
    classId: z.string().min(1, "Class is required"),
    subjectId: z.string().min(1, "Subject is required"),
    teacherId: z.string().min(1, "Teacher is required"),
    dayOfWeek: z.nativeEnum(DayOfWeek),
    startTime: z.string().min(1, "Start time is required"),
    endTime: z.string().min(1, "End time is required"),
  })
  .refine((data) => data.startTime < data.endTime, {
    message: "Start time must be earlier than end time",
    path: ["endTime"],
  })

type FormValues = z.infer<typeof formSchema>

export function ScheduleClassDialog({
  classes,
  subjects,
  teachers,
}: ScheduleClassDialogProps) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [clashError, setClashError] = useState<string | null>(null)
  const router = useRouter()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      classId: classes[0]?.id || "",
      subjectId: subjects[0]?.id || "",
      teacherId: teachers[0]?.id || "",
      dayOfWeek: DayOfWeek.MONDAY,
      startTime: "09:00",
      endTime: "09:45",
    },
  })

  const onSubmit = (data: FormValues) => {
    setClashError(null)
    startTransition(async () => {
      try {
        await createTimetablePeriod({
          classId: data.classId,
          subjectId: data.subjectId,
          teacherId: data.teacherId,
          dayOfWeek: data.dayOfWeek,
          startTime: data.startTime,
          endTime: data.endTime,
        })
        reset()
        setOpen(false)
        router.refresh()
      } catch (err: unknown) {
        if (err instanceof Error) {
          setClashError(err.message)
        } else {
          setClashError("Failed to schedule class period.")
        }
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" />
            <span>Schedule Class</span>
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Schedule Class Period</DialogTitle>
          <DialogDescription>
            Add a new time slot to the weekly timetable. Algorithmic clash detection prevents overlapping schedules.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          {clashError && (
            <div className="flex items-start gap-2 rounded-md border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
              <div>
                <span className="font-semibold block">Scheduling Conflict</span>
                <span>{clashError}</span>
              </div>
            </div>
          )}

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
                  {s.name} {s.code ? `(${s.code})` : ""}
                </option>
              ))}
            </select>
            {errors.subjectId && (
              <p className="text-[10px] text-red-500">{errors.subjectId.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700">Teacher</label>
            <select
              {...register("teacherId")}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
              <option value="">Select Teacher...</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.user?.name || "Teacher"} ({t.user?.email || "No email"})
                </option>
              ))}
            </select>
            {errors.teacherId && (
              <p className="text-[10px] text-red-500">{errors.teacherId.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700">Day of Week</label>
            <select
              {...register("dayOfWeek")}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
              <option value={DayOfWeek.MONDAY}>Monday</option>
              <option value={DayOfWeek.TUESDAY}>Tuesday</option>
              <option value={DayOfWeek.WEDNESDAY}>Wednesday</option>
              <option value={DayOfWeek.THURSDAY}>Thursday</option>
              <option value={DayOfWeek.FRIDAY}>Friday</option>
              <option value={DayOfWeek.SATURDAY}>Saturday</option>
              <option value={DayOfWeek.SUNDAY}>Sunday</option>
            </select>
            {errors.dayOfWeek && (
              <p className="text-[10px] text-red-500">{errors.dayOfWeek.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">Start Time</label>
              <input
                type="time"
                {...register("startTime")}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
              {errors.startTime && (
                <p className="text-[10px] text-red-500">{errors.startTime.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">End Time</label>
              <input
                type="time"
                {...register("endTime")}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
              {errors.endTime && (
                <p className="text-[10px] text-red-500">{errors.endTime.message}</p>
              )}
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
              {isPending ? "Saving..." : "Schedule Period"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
