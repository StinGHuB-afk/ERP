import prisma from "@/lib/prisma"
import { verifySession } from "@/lib/auth/session"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AssignSubstituteForm } from "@/components/forms/AssignSubstituteForm"
import { ArrowLeft, UserCheck, Calendar, Clock, BookOpen, ShieldCheck } from "lucide-react"

export default async function AdminSubstituteDashboardPage() {
  const session = await verifySession()
  if (!session || session.role !== "ADMIN") {
    redirect("/login")
  }

  const teachers = await prisma.teacher.findMany({
    where: { isArchived: false },
    include: { user: { select: { name: true, email: true } } },
    orderBy: { user: { name: "asc" } },
  })

  const formattedTeachers = teachers.map((t) => ({
    id: t.id,
    name: t.user.name || t.user.email,
    specialization: t.specialization,
  }))

  const classes = await prisma.class.findMany({
    orderBy: { name: "asc" },
  })

  const assignments = await prisma.substituteAssignment.findMany({
    include: {
      substituteTeacher: {
        include: { user: { select: { name: true, email: true } } },
      },
      class: { select: { name: true } },
      assignedByAdmin: { select: { name: true } },
    },
    orderBy: { validUntil: "desc" },
  })

  const now = new Date()

  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/classes"
            className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              Substitute Delegation Management
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Assign and monitor temporary substitute teachers across school classes.
            </p>
          </div>
        </div>
      </div>

      {/* Form Section */}
      <AssignSubstituteForm teachers={formattedTeachers} classes={classes} />

      {/* Assignments Table Section */}
      <Card className="shadow-sm border-slate-200 bg-white">
        <CardHeader className="border-b border-slate-100 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <UserCheck className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold text-slate-900">
                  Substitute Coverage Log
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Total recorded assignments: {assignments.length}
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {assignments.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              <UserCheck className="h-10 w-10 mx-auto mb-2 text-slate-300" />
              <p>No substitute teacher assignments recorded yet.</p>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-slate-50/50 text-[11px] font-semibold text-slate-600 uppercase">
                <TableRow>
                  <TableHead>Substitute Teacher</TableHead>
                  <TableHead>Covered Class</TableHead>
                  <TableHead>Validity Timeframe</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assigned By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-xs">
                {assignments.map((item) => {
                  const isCurrent = now >= new Date(item.validFrom) && now <= new Date(item.validUntil)
                  const isUpcoming = now < new Date(item.validFrom)
                  const isExpired = now > new Date(item.validUntil)

                  return (
                    <TableRow key={item.id} className="hover:bg-slate-50/50">
                      <TableCell className="font-semibold text-slate-800">
                        {item.substituteTeacher.user.name || item.substituteTeacher.user.email}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-slate-50 border-slate-200 text-slate-700">
                          {item.class.name}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col text-[11px] text-slate-600 gap-0.5">
                          <span className="flex items-center gap-1" suppressHydrationWarning>
                            <Calendar className="h-3 w-3 text-slate-400" />
                            From: {new Date(item.validFrom).toLocaleString()}
                          </span>
                          <span className="flex items-center gap-1" suppressHydrationWarning>
                            <Clock className="h-3 w-3 text-slate-400" />
                            Until: {new Date(item.validUntil).toLocaleString()}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {isCurrent && (
                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
                            Active Now
                          </Badge>
                        )}
                        {isUpcoming && (
                          <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                            Upcoming
                          </Badge>
                        )}
                        {isExpired && (
                          <Badge variant="outline" className="bg-slate-100 text-slate-500 border-slate-200">
                            Expired
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-slate-500 flex items-center gap-1">
                        <ShieldCheck className="h-3.5 w-3.5 text-blue-500" />
                        {item.assignedByAdmin.name || "Admin"}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
