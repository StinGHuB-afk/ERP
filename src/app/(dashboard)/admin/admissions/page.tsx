import { getAdmissionEnquiries } from "@/app/actions/admission.actions"
import { ManageApplicationDialog } from "./components/manage-application-dialog"
import { CreateApplicationDialog } from "./components/create-application-dialog"
import prisma from "@/lib/prisma"
import { getEffectiveTenantId } from "@/lib/auth/session"
import { getTenantModules } from "@/app/actions/entitlements.actions"
import { LockedModuleTeaser } from "@/components/ui/locked-module-teaser"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Users,
  Clock,
  FileSearch,
  CheckCircle2,
  UserPlus,
  Mail,
  Phone,
} from "lucide-react"

export const dynamic = "force-dynamic"

function getStatusBadgeVariant(
  status: string
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "APPROVED":
      return "default"
    case "REVIEWING":
      return "secondary"
    case "REJECTED":
      return "destructive"
    default:
      return "outline"
  }
}

function getStatusBadgeStyle(status: string): string {
  switch (status) {
    case "APPROVED":
      return "bg-emerald-500 hover:bg-emerald-600 text-white"
    case "REVIEWING":
      return "bg-blue-500 hover:bg-blue-600 text-white"
    case "REJECTED":
      return "bg-rose-500 hover:bg-rose-600 text-white"
    default:
      return "border-amber-400 text-amber-700 bg-amber-50"
  }
}

export default async function AdminAdmissionsPage() {
  const modules = await getTenantModules()
  if (!modules["ADMISSIONS"]) {
    return (
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Online Admissions & Application Funnel
          </h1>
          <p className="text-sm text-slate-500">
            Review public student admission applications, conduct evaluations, and convert approved applicants.
          </p>
        </div>
        <LockedModuleTeaser moduleName="Admissions" />
      </div>
    )
  }

  const tenantId = await getEffectiveTenantId()
  if (!tenantId) return <div className="p-6">Unauthorized</div>

  const enquiries = await getAdmissionEnquiries()
  const classes = await prisma.class.findMany({ where: { schoolId: tenantId }, select: { id: true, name: true }, orderBy: { name: "asc" } })
  const schoolId = tenantId

  const totalCount = enquiries.length
  const pendingCount = enquiries.filter((e) => e.status === "PENDING").length
  const reviewingCount = enquiries.filter((e) => e.status === "REVIEWING").length
  const approvedCount = enquiries.filter((e) => e.status === "APPROVED").length

  return (
    <div className="space-y-6 p-6">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Online Admissions & Application Funnel
          </h1>
          <p className="text-sm text-slate-500">
            Review public student admission applications, conduct evaluations, and convert approved applicants.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <CreateApplicationDialog classes={classes} schoolId={schoolId} />
        </div>
      </div>

      {/* Top-Level Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card size="sm">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Applications
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="text-2xl font-bold text-slate-900">{totalCount}</div>
            <div className="rounded-md bg-slate-100 p-2 text-slate-700">
              <Users className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Pending Review
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="text-2xl font-bold text-amber-600">{pendingCount}</div>
            <div className="rounded-md bg-amber-50 p-2 text-amber-600">
              <Clock className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Currently Reviewing
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="text-2xl font-bold text-blue-600">{reviewingCount}</div>
            <div className="rounded-md bg-blue-50 p-2 text-blue-600">
              <FileSearch className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Approved & Converted
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="text-2xl font-bold text-emerald-600">{approvedCount}</div>
            <div className="rounded-md bg-emerald-50 p-2 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Applications Data Table */}
      <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-900">
            Admission Applications Directory ({enquiries.length})
          </h2>
        </div>

        {enquiries.length === 0 ? (
          <div className="p-8 text-center">
            <UserPlus className="mx-auto h-8 w-8 text-slate-400" />
            <h3 className="mt-2 text-sm font-semibold text-slate-800">
              No admission applications submitted yet
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Public admission enquiries submitted by parents will appear here for review.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 hover:bg-slate-50">
                <TableHead className="text-xs font-bold text-slate-700">Reference / Date</TableHead>
                <TableHead className="text-xs font-bold text-slate-700">Student Details</TableHead>
                <TableHead className="text-xs font-bold text-slate-700">Target Class</TableHead>
                <TableHead className="text-xs font-bold text-slate-700">Parent Contact</TableHead>
                <TableHead className="text-xs font-bold text-slate-700">Status</TableHead>
                <TableHead className="text-right text-xs font-bold text-slate-700">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {enquiries.map((enquiry) => (
                <TableRow key={enquiry.id}>
                  <TableCell className="py-2.5">
                    <span className="font-mono text-xs font-semibold text-slate-900 block">
                      {enquiry.referenceNumber}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono" suppressHydrationWarning>
                      {new Date(enquiry.createdAt).toLocaleDateString("en-IN", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </TableCell>
                  <TableCell className="py-2.5">
                    <div className="font-semibold text-xs text-slate-900">
                      {enquiry.studentFirstName} {enquiry.studentLastName}
                    </div>
                    <div className="text-[10px] text-slate-500" suppressHydrationWarning>
                      DOB: {new Date(enquiry.dateOfBirth).toLocaleDateString("en-IN", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </div>
                  </TableCell>
                  <TableCell className="py-2.5 text-xs font-medium text-slate-900">
                    Class {enquiry.appliedForClass.name}
                  </TableCell>
                  <TableCell className="py-2.5 text-xs text-slate-700">
                    <div className="font-medium text-slate-900">{enquiry.parentName}</div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3 text-slate-400" />
                        {enquiry.parentEmail}
                      </span>
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3 text-slate-400" />
                        {enquiry.parentPhone}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="py-2.5">
                    <Badge
                      variant={getStatusBadgeVariant(enquiry.status)}
                      className={`text-[10px] font-semibold ${getStatusBadgeStyle(enquiry.status)}`}
                    >
                      {enquiry.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-2.5 text-right">
                    <ManageApplicationDialog enquiry={enquiry} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}
