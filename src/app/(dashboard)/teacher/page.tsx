import prisma from "@/lib/prisma"
import { verifySession } from "@/lib/auth/session"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BookOpen, FileText, CheckCircle, Clock, AlertTriangle, UserCheck, Calendar } from "lucide-react"
import { getTeacherSubstituteAssignments } from "@/app/actions/substitute.actions"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { RecentNotices } from "@/components/dashboard/recent-notices"

export default async function TeacherDashboard() {
  const session = await verifySession()
  const teacherUser = await prisma.user.findUnique({
    where: { id: session?.userId },
    include: { teacher: true }
  })
  
  if (!teacherUser?.teacher) return <div>Unauthorized</div>
  
  const teacherId = teacherUser.teacher.id

  const [
    assignedSubjectsCount,
    assignedClassesCount,
    publishedMarksCount,
    draftMarksCount,
    recentMarks,
    substituteRes
  ] = await Promise.all([
    prisma.subject.count({ where: { teacherId } }),
    // Classes connected via assigned subjects
    prisma.class.count({ where: { subjects: { some: { teacherId } } } }),
    prisma.mark.count({ where: { teacherId, status: 'PUBLISHED' } }),
    prisma.mark.count({ where: { teacherId, status: 'DRAFT' } }),
    prisma.mark.findMany({
      where: { teacherId },
      take: 5,
      orderBy: { updatedAt: 'desc' },
      include: {
        student: { include: { user: true } },
        subject: true
      }
    }),
    getTeacherSubstituteAssignments(teacherId)
  ])

  const substituteAssignments = substituteRes.success && substituteRes.data ? substituteRes.data : []

  return (
    <div className="space-y-8 pb-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Teacher Dashboard</h1>
          <p className="text-sm text-slate-500">Welcome back, {teacherUser.name}. Here is your academic overview.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/teacher/at-risk" className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-md font-medium text-sm transition-colors shadow-sm inline-flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            At-Risk Students
          </Link>
          <Link href="/teacher/marks" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium text-sm transition-colors shadow-sm inline-flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Quick Marks Entry
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Assigned Subjects</CardTitle>
            <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
              <BookOpen className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{assignedSubjectsCount}</div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Assigned Classes</CardTitle>
            <div className="h-8 w-8 bg-purple-100 rounded-full flex items-center justify-center">
              <BookOpen className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{assignedClassesCount}</div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Published Marks</CardTitle>
            <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{publishedMarksCount}</div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Pending Drafts</CardTitle>
            <div className="h-8 w-8 bg-yellow-100 rounded-full flex items-center justify-center">
              <Clock className="h-4 w-4 text-yellow-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{draftMarksCount}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-800">Recent Mark Entries</h2>
            <Link href="/teacher/marks" className="text-sm font-medium text-blue-600 hover:text-blue-800">View all</Link>
          </div>
          <Card className="shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Exam</TableHead>
                <TableHead className="text-right">Score</TableHead>
                <TableHead className="text-right w-[100px]">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentMarks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-slate-500 py-8">
                    You haven&apos;t entered any marks recently.
                  </TableCell>
                </TableRow>
              ) : (
                recentMarks.map((mark) => (
                  <TableRow key={mark.id} className="hover:bg-slate-50/50 transition-colors">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-medium text-slate-600">
                          {(mark.student.user.name || "NA").substring(0, 2).toUpperCase()}
                        </div>
                        {mark.student.user.name || "Unknown Student"}
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-600">{mark.subject.name}</TableCell>
                    <TableCell className="text-slate-600 text-sm">{mark.examType}</TableCell>
                    <TableCell className="text-right font-medium">
                      {mark.score} <span className="text-slate-400 text-xs">/ {mark.maxScore}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={mark.status === 'PUBLISHED' ? 'success' : 'warning'}>
                        {mark.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
              </TableBody>
            </Table>
          </Card>
        </div>
        
        <div>
          <RecentNotices role="TEACHER" />
        </div>
      </div>

      {/* Substitute Coverage Assignments Section */}
      {substituteAssignments.length > 0 && (
        <Card className="shadow-sm border-slate-200 bg-blue-50/30">
          <CardHeader className="pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                <UserCheck className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-slate-900">
                  Temporary Substitute Assignments
                </CardTitle>
                <p className="text-xs text-slate-500">
                  Classes delegated to you for temporary coverage
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4 space-y-3 text-xs">
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
              {substituteAssignments.map((sub: any) => (
                <div key={sub.id} className="p-3 bg-white rounded-lg border border-slate-200 shadow-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 text-sm">{sub.class.name}</span>
                    <Badge className="bg-blue-100 text-blue-800 border-blue-200">Substitute</Badge>
                  </div>
                  <div className="text-slate-600 space-y-1 text-[11px]">
                    <div className="flex items-center gap-1.5" suppressHydrationWarning>
                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      <span>From: {new Date(sub.validFrom).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-1.5" suppressHydrationWarning>
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                      <span>Until: {new Date(sub.validUntil).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
