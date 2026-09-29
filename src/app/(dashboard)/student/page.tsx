import { getStudentDashboardData } from "@/app/actions/student.actions"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { GraduationCap, CalendarCheck, BookOpen, AlertCircle, FileText, Calendar, CreditCard } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function StudentDashboard() {
  const data = await getStudentDashboardData()

  // Empty State Guard
  if (!data.isStudentProfileLinked || !data.student) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md shadow-sm border-slate-200">
          <CardHeader className="text-center">
            <div className="mx-auto bg-amber-100 p-3 rounded-full w-12 h-12 flex items-center justify-center mb-4">
              <AlertCircle className="w-6 h-6 text-amber-600" />
            </div>
            <CardTitle className="text-xl text-slate-900">No Student Profile Associated</CardTitle>
            <CardDescription className="text-slate-500 mt-2">
              It looks like you are viewing this portal as an Admin or Superadmin, and no specific student profile is linked to your account.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  const { student } = data
  const className = student.class?.name || "Unassigned"
  const todayPeriods = student.class?.timetablePeriods || []

  return (
    <div className="space-y-8 pb-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Student Dashboard</h1>
        <p className="text-sm text-slate-500">Welcome to your daily academic overview.</p>
      </div>

      {/* Top Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">My Class</CardTitle>
            <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
              <GraduationCap className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{className}</div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Overall Attendance</CardTitle>
            <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
              <CalendarCheck className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">85%</div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Upcoming Exams</CardTitle>
            <div className="h-8 w-8 bg-purple-100 rounded-full flex items-center justify-center">
              <BookOpen className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">2</div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <div className="flex flex-wrap gap-3">
        <Button variant="outline" className="gap-2">
          <FileText className="w-4 h-4" />
          My Report Card
        </Button>
        <Button variant="outline" className="gap-2">
          <Calendar className="w-4 h-4" />
          Submit Leave
        </Button>
        <Button variant="outline" className="gap-2">
          <CreditCard className="w-4 h-4" />
          Fees & Dues
        </Button>
      </div>

      {/* Today's Classes */}
      <Card className="shadow-sm border-slate-200 overflow-hidden">
        <CardHeader className="bg-slate-50 border-b border-slate-100">
          <CardTitle className="text-base font-semibold text-slate-800">Today&apos;s Classes</CardTitle>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Teacher</TableHead>
              <TableHead>Room</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {todayPeriods.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-slate-500 py-8">
                  No classes scheduled for today.
                </TableCell>
              </TableRow>
            ) : (
              todayPeriods.map((period: any) => (
                <TableRow key={period.id}>
                  <TableCell className="font-medium">
                    {period.startTime} - {period.endTime}
                  </TableCell>
                  <TableCell>{period.subject?.name || "N/A"}</TableCell>
                  <TableCell>{period.teacher?.user?.name || "N/A"}</TableCell>
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
