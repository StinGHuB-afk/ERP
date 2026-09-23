import prisma from "@/lib/prisma"
import { verifySession } from "@/lib/auth/session"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { TransportRequestActions } from "./transport-request-actions"
import { Bus, Clock, CheckCircle2, XCircle, Users, ArrowRight, ShieldCheck } from "lucide-react"

export default async function AdminTransportPage() {
  const session = await verifySession()
  if (!session || session.role !== "ADMIN") {
    redirect("/login")
  }

  const [pendingRequests, activeAssignments, recentProcessed] = await Promise.all([
    prisma.transportChangeRequest.findMany({
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
    prisma.transportAssignment.findMany({
      include: {
        student: {
          include: {
            user: { select: { name: true, email: true } },
            class: { select: { name: true } },
          },
        },
      },
      orderBy: { routeName: "asc" },
      take: 50,
    }),
    prisma.transportChangeRequest.findMany({
      where: { status: { in: ["APPROVED", "REJECTED"] } },
      include: {
        student: {
          include: {
            user: { select: { name: true } },
            class: { select: { name: true } },
          },
        },
        approvingAdmin: { select: { name: true } },
      },
      orderBy: { processedAt: "desc" },
      take: 10,
    }),
  ])

  const totalPending = pendingRequests.length
  const totalAssignments = activeAssignments.length
  const uniqueRoutesCount = new Set(activeAssignments.map((a) => a.routeName)).size

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <Bus className="h-6 w-6 text-blue-600" />
            Transport Approval Dashboard
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage student bus route assignments, review route change requests, and enforce transport safety.
          </p>
        </div>
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="shadow-sm border-slate-200 bg-white">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-amber-50 rounded-xl text-amber-600">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Pending Requests
              </div>
              <div className="text-2xl font-black text-slate-900 mt-0.5">{totalPending}</div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200 bg-white">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Active Assignments
              </div>
              <div className="text-2xl font-black text-slate-900 mt-0.5">{totalAssignments}</div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200 bg-white">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
              <Bus className="h-6 w-6" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Active Bus Routes
              </div>
              <div className="text-2xl font-black text-slate-900 mt-0.5">{uniqueRoutesCount}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Requests Approval Queue */}
      <Card className="shadow-sm border-slate-200 bg-white overflow-hidden">
        <CardHeader className="bg-slate-50/70 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-amber-600" />
              <CardTitle className="text-base font-semibold text-slate-900">
                Pending Route Change Approval Queue
              </CardTitle>
            </div>
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs">
              {totalPending} Awaiting Decision
            </Badge>
          </div>
          <CardDescription>
            Requests submitted by students or parents requiring administrative review and approval.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {pendingRequests.length === 0 ? (
            <div className="text-center py-12 px-4 text-slate-500 text-sm">
              <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
              <p className="font-semibold text-slate-800">Queue is completely empty</p>
              <p className="text-xs text-slate-500 mt-1">There are no pending transport route change requests.</p>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="font-bold text-slate-700 text-xs">Student</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs">Current Route</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs">Requested Route</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs">Pickup / Drop</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs">Reason</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingRequests.map((req) => (
                  <TableRow key={req.id} className="hover:bg-slate-50/50">
                    <TableCell className="py-4">
                      <div className="font-bold text-slate-900 text-sm">{req.student.user.name || "Unknown"}</div>
                      <div className="text-xs text-slate-500">
                        Class: {req.student.class?.name || "Unassigned"} • {req.student.user.email}
                      </div>
                    </TableCell>

                    <TableCell className="py-4 text-xs font-medium text-slate-600">
                      {req.currentRouteName ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold">
                          {req.currentRouteName}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">None (Unassigned)</span>
                      )}
                    </TableCell>

                    <TableCell className="py-4 text-xs font-semibold text-slate-900">
                      <div className="flex items-center gap-1.5 text-blue-700 font-bold">
                        <ArrowRight className="h-3.5 w-3.5" />
                        <span>{req.requestedRouteName}</span>
                      </div>
                      {req.requestedBusNumber && (
                        <div className="text-[11px] text-slate-500 mt-0.5 font-normal">
                          Bus #{req.requestedBusNumber}
                        </div>
                      )}
                    </TableCell>

                    <TableCell className="py-4 text-xs text-slate-700">
                      <div><span className="font-semibold text-slate-500">P:</span> {req.requestedPickupPoint || "Default"}</div>
                      <div><span className="font-semibold text-slate-500">D:</span> {req.requestedDropPoint || "Default"}</div>
                    </TableCell>

                    <TableCell className="py-4 text-xs text-slate-600 max-w-[200px] truncate">
                      {req.reason || <span className="text-slate-400 italic">No reason provided</span>}
                    </TableCell>

                    <TableCell className="py-4 text-right">
                      <TransportRequestActions
                        requestId={req.id}
                        studentName={req.student.user.name || "Student"}
                        requestedRouteName={req.requestedRouteName}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Active Student Assignments Grid */}
      <Card className="shadow-sm border-slate-200 bg-white">
        <CardHeader className="border-b border-slate-200 bg-slate-50/50">
          <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <Bus className="h-4 w-4 text-blue-600" />
            Active Student Transport Assignments ({activeAssignments.length})
          </CardTitle>
          <CardDescription>
            Live list of students actively assigned to school bus routes.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {activeAssignments.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs">
              No active transport assignments found.
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="font-bold text-slate-700 text-xs">Student</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs">Class</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs">Route Name</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs">Bus Number</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs">Pickup / Drop</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeAssignments.map((assignment) => (
                  <TableRow key={assignment.id} className="hover:bg-slate-50/50">
                    <TableCell className="font-semibold text-slate-900 text-xs py-3">
                      {assignment.student.user.name || "Unknown"}
                    </TableCell>
                    <TableCell className="text-xs text-slate-600 py-3">
                      {assignment.student.class?.name || "Unassigned"}
                    </TableCell>
                    <TableCell className="font-bold text-blue-700 text-xs py-3">
                      {assignment.routeName}
                    </TableCell>
                    <TableCell className="text-xs font-semibold text-slate-800 py-3">
                      Bus #{assignment.busNumber}
                    </TableCell>
                    <TableCell className="text-xs text-slate-600 py-3">
                      {assignment.pickupPoint} / {assignment.dropPoint}
                    </TableCell>
                    <TableCell className="py-3">
                      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px]">
                        {assignment.status}
                      </Badge>
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
