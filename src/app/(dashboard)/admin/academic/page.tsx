import { getTimetable, getAssignments } from "@/app/actions/academic.actions"
import { verifySession, getEffectiveTenantId } from "@/lib/auth/session"
import prisma from "@/lib/prisma"
import { ScheduleClassDialog } from "./components/schedule-class-dialog"
import { CreateAssignmentDialog } from "./components/create-assignment-dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Calendar,
  BookOpen,
  Clock,
  FileText,
  GraduationCap,
} from "lucide-react"

export const dynamic = "force-dynamic"

function formatDayOfWeek(day: string): string {
  if (!day) return ""
  return day.charAt(0).toUpperCase() + day.slice(1).toLowerCase()
}

export default async function AdminAcademicPage() {
  const session = await verifySession()
  const tenantId = await getEffectiveTenantId()
  if (!tenantId) return <div className="p-6">Unauthorized</div>

  const [timetablePeriods, assignments, classes, subjects, teachers] = await Promise.all([
    getTimetable(),
    getAssignments(),
    prisma.class.findMany({
      where: { schoolId: tenantId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.subject.findMany({
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    }),
    prisma.teacher.findMany({
      where: { user: { schoolId: tenantId } },
      select: {
        id: true,
        user: { select: { name: true, email: true } },
      },
      orderBy: { user: { name: "asc" } },
    }),
  ])

  return (
    <div className="space-y-6 p-6">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Academic & Scheduling Hub
          </h1>
          <p className="text-sm text-slate-500">
            Manage weekly class timetables, teacher schedules, and student homework assignments.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <ScheduleClassDialog
            classes={classes}
            subjects={subjects}
            teachers={teachers}
          />
          <CreateAssignmentDialog
            classes={classes}
            subjects={subjects}
            teachers={teachers}
          />
        </div>
      </div>

      {/* Top-Level Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card size="sm">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Scheduled Classes
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="text-2xl font-bold text-slate-900">
              {timetablePeriods.length}
            </div>
            <div className="rounded-md bg-blue-50 p-2 text-blue-600">
              <Clock className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Active Assignments
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="text-2xl font-bold text-slate-900">
              {assignments.length}
            </div>
            <div className="rounded-md bg-purple-50 p-2 text-purple-600">
              <FileText className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="timetable" className="space-y-4">
        <TabsList className="bg-slate-100 p-1 border border-slate-200 rounded-lg">
          <TabsTrigger value="timetable" className="text-xs font-medium px-4">
            Class Timetable ({timetablePeriods.length})
          </TabsTrigger>
          <TabsTrigger value="assignments" className="text-xs font-medium px-4">
            Assignments ({assignments.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Timetable */}
        <TabsContent value="timetable" className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-900">
                  Weekly Class Schedules
                </h2>
                <p className="text-[11px] text-slate-500">
                  Conflict-free scheduling across days and class periods.
                </p>
              </div>
              <ScheduleClassDialog
                classes={classes}
                subjects={subjects}
                teachers={teachers}
              />
            </div>

            {timetablePeriods.length === 0 ? (
              <div className="p-8 text-center">
                <Calendar className="mx-auto h-8 w-8 text-slate-400" />
                <h3 className="mt-2 text-sm font-semibold text-slate-800">
                  No timetable periods scheduled
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  Add class schedule slots to build the school weekly master timetable.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 hover:bg-slate-50">
                    <TableHead className="text-xs font-bold text-slate-700">Day of Week</TableHead>
                    <TableHead className="text-xs font-bold text-slate-700">Time</TableHead>
                    <TableHead className="text-xs font-bold text-slate-700">Class</TableHead>
                    <TableHead className="text-xs font-bold text-slate-700">Subject</TableHead>
                    <TableHead className="text-xs font-bold text-slate-700">Teacher</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {timetablePeriods.map((period) => (
                    <TableRow key={period.id}>
                      <TableCell className="py-2.5 font-medium text-xs text-slate-900">
                        <Badge variant="outline" className="text-[10px] font-semibold bg-slate-50">
                          {formatDayOfWeek(period.dayOfWeek)}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-2.5 text-xs text-slate-600 font-mono" suppressHydrationWarning>
                        {period.startTime} - {period.endTime}
                      </TableCell>
                      <TableCell className="py-2.5 text-xs font-medium text-slate-900">
                        Class {period.class.name}
                      </TableCell>
                      <TableCell className="py-2.5 text-xs text-slate-700">
                        <span className="font-semibold text-slate-900">{period.subject.name}</span>
                        <span className="text-[10px] text-slate-500 ml-1.5 font-mono">({period.subject.code})</span>
                      </TableCell>
                      <TableCell className="py-2.5 text-xs text-slate-700">
                        {period.teacher?.user?.name ? (
                          <div className="flex items-center gap-1.5">
                            <GraduationCap className="h-3.5 w-3.5 text-slate-400" />
                            <span>{period.teacher.user.name}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Unassigned</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>

        {/* Tab 2: Assignments */}
        <TabsContent value="assignments" className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-900">
                  Course Homework & Assignments
                </h2>
                <p className="text-[11px] text-slate-500">
                  Track due dates, assignment instructions, and max marks.
                </p>
              </div>
              <CreateAssignmentDialog
                classes={classes}
                subjects={subjects}
                teachers={teachers}
              />
            </div>

            {assignments.length === 0 ? (
              <div className="p-8 text-center">
                <BookOpen className="mx-auto h-8 w-8 text-slate-400" />
                <h3 className="mt-2 text-sm font-semibold text-slate-800">
                  No assignments created
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  Create coursework assignments for students and manage grading.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 hover:bg-slate-50">
                    <TableHead className="text-xs font-bold text-slate-700">Title & Description</TableHead>
                    <TableHead className="text-xs font-bold text-slate-700">Class</TableHead>
                    <TableHead className="text-xs font-bold text-slate-700">Subject</TableHead>
                    <TableHead className="text-xs font-bold text-slate-700">Assigned By</TableHead>
                    <TableHead className="text-xs font-bold text-slate-700">Due Date</TableHead>
                    <TableHead className="text-right text-xs font-bold text-slate-700">Max Marks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignments.map((asm) => (
                    <TableRow key={asm.id}>
                      <TableCell className="py-2.5">
                        <div className="font-semibold text-xs text-slate-900">{asm.title}</div>
                        {asm.description && (
                          <div className="text-[11px] text-slate-500 max-w-[280px] truncate">
                            {asm.description}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="py-2.5 text-xs font-medium text-slate-900">
                        Class {asm.class.name}
                      </TableCell>
                      <TableCell className="py-2.5 text-xs text-slate-700">
                        <span className="font-medium text-slate-900">{asm.subject.name}</span>
                      </TableCell>
                      <TableCell className="py-2.5 text-xs text-slate-700">
                        {asm.teacher?.user?.name || "Teacher"}
                      </TableCell>
                      <TableCell className="py-2.5 text-xs text-slate-600 font-mono" suppressHydrationWarning>
                        {new Date(asm.dueDate).toLocaleDateString("en-IN", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </TableCell>
                      <TableCell className="py-2.5 text-right text-xs font-semibold text-slate-900 font-mono">
                        {asm.maxMarks !== null && asm.maxMarks !== undefined ? asm.maxMarks : "N/A"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
