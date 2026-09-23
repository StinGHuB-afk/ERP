import prisma from "@/lib/prisma"
import { verifySession } from "@/lib/auth/session"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { ProfileRequestActions } from "./profile-request-actions"
import { UserCheck, Clock, CheckCircle2, ShieldAlert, FileEdit } from "lucide-react"
import { RequestedProfileData } from "@/app/actions/enterprise"

export default async function TeacherProfileRequestsPage() {
  const session = await verifySession()
  if (!session || (session.role !== "TEACHER" && session.role !== "ADMIN")) {
    redirect("/login")
  }

  const [pendingRequests, processedRequests] = await Promise.all([
    prisma.profileUpdateRequest.findMany({
      where: { status: "PENDING" },
      include: {
        student: {
          include: {
            user: { select: { name: true, email: true } },
            class: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.profileUpdateRequest.findMany({
      where: { status: { in: ["APPROVED", "REJECTED"] } },
      include: {
        student: {
          include: {
            user: { select: { name: true } },
            class: { select: { name: true } },
          },
        },
        approvingTeacher: { select: { name: true } },
      },
      orderBy: { processedAt: "desc" },
      take: 15,
    }),
  ])

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
          <UserCheck className="h-6 w-6 text-blue-600" />
          Profile Update Approval Queue
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Review and verify emergency contact and profile change requests submitted by students and parents.
        </p>
      </div>

      {/* Pending Requests Queue Card */}
      <Card className="shadow-sm border-slate-200 bg-white overflow-hidden">
        <CardHeader className="bg-slate-50/70 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-amber-600" />
              <CardTitle className="text-base font-semibold text-slate-900">
                Pending Profile Change Requests ({pendingRequests.length})
              </CardTitle>
            </div>
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs">
              {pendingRequests.length} Awaiting Verification
            </Badge>
          </div>
          <CardDescription>
            Verify requested contact changes before committing them to official student records.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {pendingRequests.length === 0 ? (
            <div className="text-center py-12 px-4 text-slate-500 text-sm">
              <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
              <p className="font-semibold text-slate-800">No Pending Profile Requests</p>
              <p className="text-xs text-slate-500 mt-1">All student profile update requests have been processed.</p>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="font-bold text-slate-700 text-xs">Student</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs">Current Emergency Contact</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs">Requested Edits</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs">Submitted Date</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingRequests.map((req) => {
                  let parsed: RequestedProfileData = {}
                  try {
                    parsed = JSON.parse(req.requestedData) as RequestedProfileData
                  } catch {
                    parsed = {}
                  }

                  return (
                    <TableRow key={req.id} className="hover:bg-slate-50/50">
                      <TableCell className="py-4">
                        <div className="font-bold text-slate-900 text-sm">{req.student.user.name || "Unknown"}</div>
                        <div className="text-xs text-slate-500">
                          Class: {req.student.class?.name || "Unassigned"} • {req.student.user.email}
                        </div>
                      </TableCell>

                      <TableCell className="py-4 text-xs text-slate-600">
                        <div><span className="font-semibold text-slate-700">{req.student.emergencyContactName || "None"}</span></div>
                        <div className="text-slate-500">{req.student.emergencyContactPhone || "No Phone"} ({req.student.emergencyContactRelation || "N/A"})</div>
                      </TableCell>

                      <TableCell className="py-4 text-xs">
                        <div className="p-2.5 bg-blue-50/80 rounded-lg border border-blue-100 text-blue-900 space-y-0.5">
                          <div className="font-bold">{parsed.emergencyContactName || "N/A"}</div>
                          <div className="text-[11px] text-blue-700 font-medium">
                            Phone: {parsed.emergencyContactPhone || "N/A"} ({parsed.emergencyContactRelation || "N/A"})
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="py-4 text-xs text-slate-500" suppressHydrationWarning>
                        {new Date(req.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </TableCell>

                      <TableCell className="py-4 text-right">
                        <ProfileRequestActions
                          requestId={req.id}
                          studentName={req.student.user.name || "Student"}
                        />
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* History Log of Processed Profile Requests */}
      <Card className="shadow-sm border-slate-200 bg-white">
        <CardHeader className="border-b border-slate-200 bg-slate-50/50">
          <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <Clock className="h-4 w-4 text-slate-600" />
            Recent Profile Request Audit History ({processedRequests.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {processedRequests.length === 0 ? (
            <div className="text-center py-6 text-slate-400 text-xs">
              No historical profile requests recorded yet.
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="font-bold text-slate-700 text-xs">Student</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs">Status</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs">Processed By</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs">Processed Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {processedRequests.map((req) => (
                  <TableRow key={req.id} className="hover:bg-slate-50/50">
                    <TableCell className="font-bold text-slate-900 text-xs py-3">
                      {req.student.user.name} ({req.student.class?.name || "Unassigned"})
                    </TableCell>
                    <TableCell className="py-3">
                      <Badge
                        className={
                          req.status === "APPROVED"
                            ? "bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px]"
                            : "bg-rose-100 text-rose-800 border-rose-200 text-[10px]"
                        }
                      >
                        {req.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-slate-600 py-3">
                      {req.approvingTeacher?.name || "Staff"}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500 py-3" suppressHydrationWarning>
                      {req.processedAt ? new Date(req.processedAt).toLocaleDateString() : "N/A"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
