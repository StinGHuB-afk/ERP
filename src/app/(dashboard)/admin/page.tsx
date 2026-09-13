import prisma from "@/lib/prisma"
import { StatCard } from "@/components/dashboard/stat-card"
import { GraduationCap, Users, BookOpen, Activity, CheckCircle, Clock, FileText } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { AdminCharts } from "@/components/dashboard/admin-charts"

export default async function AdminDashboard() {
  const [
    totalStudents,
    totalTeachers,
    totalClasses,
    totalSubjects,
    publishedMarksCount,
    draftMarksCount,
    recentMarks,
    allPublishedMarks,
    subjects,
  ] = await Promise.all([
    prisma.student.count(),
    prisma.teacher.count(),
    prisma.class.count(),
    prisma.subject.count(),
    prisma.mark.count({ where: { status: "PUBLISHED" } }),
    prisma.mark.count({ where: { status: "DRAFT" } }),
    prisma.mark.findMany({
      take: 6,
      orderBy: { updatedAt: "desc" },
      include: {
        student: { include: { user: true, class: true } },
        subject: true,
      },
    }),
    prisma.mark.findMany({ where: { status: "PUBLISHED" }, include: { subject: true } }),
    prisma.subject.findMany(),
  ])

  // Calculate Average School Performance
  let totalScore = 0
  let totalMaxScore = 0
  allPublishedMarks.forEach((mark) => {
    totalScore += mark.score
    totalMaxScore += mark.maxScore
  })
  const averagePerformance = totalMaxScore > 0 ? ((totalScore / totalMaxScore) * 100).toFixed(1) : "0.0"

  // Calculate subject-wise averages for chart
  const marksBySubject = subjects
    .map((sub) => {
      const subMarks = allPublishedMarks.filter((m) => m.subjectId === sub.id)
      if (subMarks.length === 0) return { name: sub.name, average: 0 }

      const subTotal = subMarks.reduce((sum, m) => sum + m.score, 0)
      const subMax = subMarks.reduce((sum, m) => sum + m.maxScore, 0)
      return {
        name: sub.name,
        average: Number(((subTotal / subMax) * 100).toFixed(1)),
      }
    })
    .filter((s) => s.average > 0)

  const statusDistribution = [
    { name: "Published", value: publishedMarksCount, color: "#10b981" },
    { name: "Draft", value: draftMarksCount, color: "#f59e0b" },
  ].filter((s) => s.value > 0)

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">Admin Dashboard</h1>
        <p className="text-xs text-slate-500 mt-0.5">Overview of academic performance and administrative operations.</p>
      </div>

      {/* Primary Key Metric Cards Grid — Pure White Surfaces, Bare Icons, No Squircles */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Students"
          value={totalStudents.toLocaleString()}
          subtitle="Enrolled Student Body"
          icon={GraduationCap}
        />

        <StatCard
          title="Total Teachers"
          value={totalTeachers.toLocaleString()}
          subtitle="Active Faculty Members"
          icon={Users}
        />

        <StatCard
          title="Academic Entities"
          value={`${totalClasses} Classes`}
          subtitle={`${totalSubjects} Registered Subjects`}
          icon={BookOpen}
        />

        <StatCard
          title="School Avg Performance"
          value={`${averagePerformance}%`}
          subtitle="Based on published term marks"
          icon={Activity}
        />
      </div>

      {/* Marks Pipeline Status — Flattened Single Surface without nested sub-cards */}
      <div className="bg-white border border-slate-200 rounded-lg p-6">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">
          Marks Publishing Pipeline
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
              <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
              <span>Published Marks</span>
            </div>
            <div className="text-2xl font-semibold text-slate-900">{publishedMarksCount.toLocaleString()}</div>
          </div>

          <div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
              <Clock className="h-3.5 w-3.5 text-amber-500" />
              <span>Pending Drafts</span>
            </div>
            <div className="text-2xl font-semibold text-slate-900">{draftMarksCount.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      {marksBySubject.length > 0 && statusDistribution.length > 0 && (
        <AdminCharts marksBySubject={marksBySubject} statusDistribution={statusDistribution} />
      )}

      {/* Recent Activity Table — Pure White Card, Clean Borders */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="p-4 border-b border-slate-200">
          <h2 className="text-sm font-semibold text-slate-900">Recent Marks Activity</h2>
        </div>
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="w-[250px]">Student</TableHead>
              <TableHead>Class</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Exam</TableHead>
              <TableHead className="text-right">Score</TableHead>
              <TableHead className="text-right w-[100px]">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recentMarks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-36 text-center">
                  <div className="flex flex-col items-center justify-center text-slate-500">
                    <FileText className="h-8 w-8 text-slate-300 mb-2" />
                    <p className="font-medium text-slate-700 text-sm">No marks recorded yet</p>
                    <p className="text-xs text-slate-400 mt-0.5">When teachers publish marks, they will appear here.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              recentMarks.map((mark) => (
                <TableRow key={mark.id} className="hover:bg-slate-50 transition-colors">
                  <TableCell className="font-medium text-xs text-slate-900">
                    {mark.student.user.name || "Unknown Student"}
                  </TableCell>
                  <TableCell className="text-xs text-slate-600">{mark.student.class?.name || "N/A"}</TableCell>
                  <TableCell className="text-xs text-slate-600">{mark.subject.name}</TableCell>
                  <TableCell className="text-xs text-slate-600">{mark.examType}</TableCell>
                  <TableCell className="text-right text-xs font-mono font-semibold">
                    {mark.score} <span className="text-slate-400 font-normal">/ {mark.maxScore}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant={mark.status === "PUBLISHED" ? "success" : "warning"} className="text-[10px]">
                      {mark.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
