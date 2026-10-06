import prisma from "@/lib/prisma"
import { getEffectiveTenantId } from "@/lib/auth/session"
import { Prisma } from "@prisma/client"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TeacherForm } from "./teacher-form"
import { DeleteTeacherButton } from "./delete-teacher"
import { DataTableSearch } from "@/components/ui/data-table-search"
import { PaginationControls } from "@/components/ui/pagination-controls"
import { AssignClassModal } from "@/components/dashboard/assign-class-modal"
import { Badge } from "@/components/ui/badge"
import { CsvExportButton } from "@/components/dashboard/csv-export-button"
import { exportAllTeachers } from "@/app/actions/export"
import { ResetPasswordButton } from "@/components/dashboard/reset-password-button"

import { TeacherCsvUploader } from "@/components/admin/teacher-csv-uploader"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Upload } from "lucide-react"

export default async function AdminTeachersPage(
  props: { searchParams: Promise<{ q?: string, page?: string }> }
) {
  const searchParams = await props.searchParams
  const query = searchParams.q || ""
  const page = parseInt(searchParams.page || "1")
  const pageSize = 10

  const tenantId = await getEffectiveTenantId()
  if (!tenantId) return <div className="p-6">Unauthorized</div>

  const whereCondition: Prisma.TeacherWhereInput = {
    user: {
      name: { contains: query },
      schoolId: tenantId
    }
  }

    const [teachers, totalItems, rawClasses] = await Promise.all([
      prisma.teacher.findMany({
        where: whereCondition,
        include: {
          user: true,
          classes: true, // A teacher can be assigned as a class teacher
        },
        orderBy: { user: { name: 'asc' } },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.teacher.count({ where: whereCondition }),
      prisma.class.findMany({ 
        where: { schoolId: tenantId }, 
        select: { 
          id: true, 
          name: true,
          teacherId: true,
          teacher: { select: { user: { select: { name: true } } } }
        }, 
        orderBy: { name: 'asc' } 
      })
    ])

    const classes = rawClasses.map(c => ({
      id: c.id,
      name: c.name,
      teacherId: c.teacherId,
      teacherName: c.teacher?.user?.name || null
    }))

  const exportData = (Array.isArray(teachers) ? teachers : []).map(teacher => ({
    teacherId: `TCH-${teacher.id.slice(0, 8).toUpperCase()}`,
    name: teacher.user.name,
    email: teacher.user.email,
    assignedClass: teacher.classes && teacher.classes.length > 0 ? teacher.classes[0].name : "Not Assigned",
    enrolledDate: new Date(teacher.user.createdAt).toLocaleDateString()
  }))

  const exportColumns = [
    { header: "Teacher Unique ID", key: "teacherId" },
    { header: "Name", key: "name" },
    { header: "Email", key: "email" },
    { header: "Assigned Class", key: "assignedClass" },
    { header: "Enrolled Date", key: "enrolledDate" }
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Manage Teachers</h1>
        <div className="flex items-center gap-3">
          <CsvExportButton
            data={exportData as Record<string, unknown>[]}
            filename="Teachers_Export"
            columns={exportColumns}
            fetchAllAction={exportAllTeachers.bind(null) as any}
            label="Export All Teachers"
          />
          <Dialog>
            <DialogTrigger
              suppressHydrationWarning
              render={
                <Button
                  variant="outline"
                  className="gap-2 bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  suppressHydrationWarning
                >
                  <Upload className="h-4 w-4 text-slate-500" />
                  Upload CSV
                </Button>
              }
            />
            <DialogContent className="max-w-3xl p-6 bg-white rounded-xl">
              <DialogHeader>
                <DialogTitle className="sr-only">CSV Teacher Onboarding</DialogTitle>
              </DialogHeader>
              <TeacherCsvUploader />
            </DialogContent>
          </Dialog>
          <TeacherForm />
        </div>
      </div>

      <div className="flex items-center gap-4 bg-white p-4 rounded-md shadow-sm border border-slate-200">
        <DataTableSearch placeholder="Search by name..." />
      </div>

      <div className="rounded-md border bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead>Teacher Unique ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Class Teacher</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {teachers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-slate-500">
                  No teachers found matching your criteria.
                </TableCell>
              </TableRow>
            ) : (
              (Array.isArray(teachers) ? teachers : []).map((teacher) => (
                <TableRow key={teacher.id} className="hover:bg-slate-50/50">
                  <TableCell className="font-mono text-xs font-semibold text-blue-700 bg-blue-50/50 rounded-md">
                    TCH-{teacher.id.slice(0, 8).toUpperCase()}
                  </TableCell>
                  <TableCell className="font-medium text-slate-800">{teacher.user.name || "Unknown Teacher"}</TableCell>
                  <TableCell className="text-slate-600">{teacher.user.email}</TableCell>
                  <TableCell>
                    {teacher.classes && teacher.classes.length > 0 ? (
                      <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-none">
                        {teacher.classes[0].name}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-slate-100 text-slate-500 border-none">
                        Not Assigned
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end items-center gap-2">
                      <AssignClassModal 
                        teacherId={teacher.id} 
                        teacherName={teacher.user.name || "Unknown"} 
                        assignedClassId={teacher.classes && teacher.classes.length > 0 ? teacher.classes[0].id : null}
                        classes={classes}
                      />
                      <ResetPasswordButton userId={teacher.userId} userName={teacher.user.name || "Teacher"} />
                      <DeleteTeacherButton id={teacher.user.id} />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <PaginationControls totalItems={totalItems} pageSize={pageSize} currentPage={page} />
      </div>
    </div>
  )
}
