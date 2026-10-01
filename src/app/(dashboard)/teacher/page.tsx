import Link from "next/link"
import { getTeacherDashboardData } from "@/app/actions/teacher.actions"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { buttonVariants } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Calendar, CheckSquare, Users, BookOpen, Clock, AlertCircle } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function TeacherDashboard() {
  const data = await getTeacherDashboardData()

  if (!data.isTeacherProfileLinked || !data.teacher) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md shadow-sm border-slate-200">
          <CardHeader className="text-center">
            <div className="mx-auto bg-amber-100 p-3 rounded-full w-12 h-12 flex items-center justify-center mb-4">
              <AlertCircle className="w-6 h-6 text-amber-600" />
            </div>
            <CardTitle className="text-xl text-slate-900">No Teacher Profile Associated</CardTitle>
            <CardDescription className="text-slate-500 mt-2">
              It looks like you are viewing this portal as an Admin or Superadmin, and no specific teaching schedule is linked to your account.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  const { teacher } = data

  return (
    <div className="space-y-8 pb-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Teacher Dashboard</h1>
        <p className="text-sm text-slate-500">Overview of your daily schedule and tasks.</p>
      </div>

      {/* Top Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Classes Assigned</CardTitle>
            <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
              <Users className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{teacher.classesAssignedCount}</div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Periods Today</CardTitle>
            <div className="h-8 w-8 bg-purple-100 rounded-full flex items-center justify-center">
              <Clock className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{teacher.periodsTodayCount}</div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Pending Tasks</CardTitle>
            <div className="h-8 w-8 bg-amber-100 rounded-full flex items-center justify-center">
              <CheckSquare className="h-4 w-4 text-amber-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{teacher.pendingTasksCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Link href="/teacher/attendance" className={buttonVariants({ variant: "outline", className: "gap-2" })}>
          <CheckSquare className="w-4 h-4" />
          Take Attendance
        </Link>
        <Link href="/teacher/marks" className={buttonVariants({ variant: "outline", className: "gap-2" })}>
          <BookOpen className="w-4 h-4" />
          Gradebook
        </Link>
        <Link href="/teacher/leave" className={buttonVariants({ variant: "outline", className: "gap-2" })}>
          <Calendar className="w-4 h-4" />
          Request Leave
        </Link>
      </div>

      {/* Today's Schedule */}
      <Card className="shadow-sm border-slate-200 overflow-hidden">
        <CardHeader className="bg-slate-50 border-b border-slate-100">
          <CardTitle className="text-base font-semibold text-slate-800">Today&apos;s Schedule</CardTitle>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Class</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Room</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {teacher.timetablePeriods.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-slate-500 py-8">
                  No periods scheduled for today.
                </TableCell>
              </TableRow>
            ) : (
              teacher.timetablePeriods.map((period: any) => (
                <TableRow key={period.id}>
                  <TableCell className="font-medium">
                    {period.startTime} - {period.endTime}
                  </TableCell>
                  <TableCell>{period.class?.name || "N/A"}</TableCell>
                  <TableCell>{period.subject?.name || "N/A"}</TableCell>
                  <TableCell className="text-slate-500">TBA</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
