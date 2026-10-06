import { getLeaveRequests, getAssets } from "@/app/actions/operations.actions"
import { verifySession, getEffectiveTenantId } from "@/lib/auth/session"
import prisma from "@/lib/prisma"
import { ApplyLeaveDialog } from "./components/apply-leave-dialog"
import { LeaveActionButtons } from "./components/leave-action-buttons"
import { RegisterAssetDialog } from "./components/register-asset-dialog"
import { ManageAssetDialog } from "./components/manage-asset-dialog"
import { getTenantModules } from "@/app/actions/entitlements.actions"
import { LockedModuleTeaser } from "@/components/ui/locked-module-teaser"
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
  CalendarDays,
  Package,
  Clock,
  AlertTriangle,
  UserCheck,
  Laptop,
} from "lucide-react"

export const dynamic = "force-dynamic"

export default async function AdminOperationsPage() {
  const session = await verifySession()

  const modules = await getTenantModules()
  if (!modules["ASSETS"]) {
    return <LockedModuleTeaser moduleName="Operations & Asset Management" />
  }

  const [leaveRequests, assets] = await Promise.all([
    getLeaveRequests(),
    getAssets(),
  ])

  const tenantId = await getEffectiveTenantId()
  if (!tenantId) return <div className="p-6">Unauthorized</div>

  const tenantUsers = await prisma.user.findMany({
    where: { schoolId: tenantId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
    orderBy: { name: "asc" },
  })

  const pendingLeavesCount = leaveRequests.filter((l) => l.status === "PENDING").length
  const assignedAssetsCount = assets.filter((a) => a.status === "ASSIGNED").length
  const maintenanceAssetsCount = assets.filter((a) => a.status === "MAINTENANCE").length

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Operations & HR Management
          </h1>
          <p className="text-xs text-slate-500">
            Process staff/student leave requests and track tenant asset inventory allocation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <ApplyLeaveDialog />
          <RegisterAssetDialog />
        </div>
      </div>

      {/* Metrics Overview */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card size="sm">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Pending Leave Requests
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="text-xl font-bold text-slate-900">{pendingLeavesCount}</div>
            <div className="rounded-md bg-amber-50 p-2 text-amber-600">
              <Clock className="h-4 w-4" />
            </div>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Assets Registered
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="text-xl font-bold text-slate-900">{assets.length}</div>
            <div className="rounded-md bg-blue-50 p-2 text-blue-600">
              <Package className="h-4 w-4" />
            </div>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Assigned Assets
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="text-xl font-bold text-slate-900">{assignedAssetsCount}</div>
            <div className="rounded-md bg-emerald-50 p-2 text-emerald-600">
              <UserCheck className="h-4 w-4" />
            </div>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Under Maintenance
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="text-xl font-bold text-slate-900">{maintenanceAssetsCount}</div>
            <div className="rounded-md bg-red-50 p-2 text-red-600">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="leaves" className="space-y-4">
        <TabsList className="bg-slate-100 p-1 border border-slate-200 rounded-lg">
          <TabsTrigger value="leaves" className="text-xs font-medium px-4">
            Leave Requests ({leaveRequests.length})
          </TabsTrigger>
          <TabsTrigger value="assets" className="text-xs font-medium px-4">
            Asset Inventory ({assets.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Leave Requests */}
        <TabsContent value="leaves" className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-4 py-3">
              <h2 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                Staff & Student Leave Approvals
              </h2>
            </div>

            {leaveRequests.length === 0 ? (
              <div className="p-8 text-center">
                <CalendarDays className="mx-auto h-8 w-8 text-slate-400" />
                <h3 className="mt-2 text-sm font-semibold text-slate-800">No leave requests found</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Leave requests submitted by staff and students will appear here for review.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Applicant</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Dates</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Reviewer / Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaveRequests.map((leave) => (
                    <TableRow key={leave.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-900 text-xs">{leave.user.name || "N/A"}</span>
                          <span className="text-[10px] text-slate-500">{leave.user.email} • {leave.user.role}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700 border border-slate-200">
                          {leave.type}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-slate-600 whitespace-nowrap" suppressHydrationWarning>
                        {new Date(leave.startDate).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                        {" - "}
                        {new Date(leave.endDate).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600 max-w-[240px] truncate" title={leave.reason}>
                        {leave.reason}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={getLeaveStatusVariant(leave.status)} className="text-[10px]">
                          {leave.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {leave.status === "PENDING" ? (
                          <LeaveActionButtons leaveId={leave.id} />
                        ) : (
                          <span className="text-[11px] text-slate-500 font-medium">
                            Reviewed by {leave.reviewer?.name || "System"}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>

        {/* Tab 2: Asset Inventory */}
        <TabsContent value="assets" className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-4 py-3 flex items-center justify-between">
              <h2 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                Tenant Asset Inventory & Holder Assignments
              </h2>
            </div>

            {assets.length === 0 ? (
              <div className="p-8 text-center">
                <Laptop className="mx-auto h-8 w-8 text-slate-400" />
                <h3 className="mt-2 text-sm font-semibold text-slate-800">No assets registered</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Register laptops, books, or lab equipment to assign to staff and students.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset Name & Category</TableHead>
                    <TableHead>Identifier / Serial</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assets.map((asset) => (
                    <TableRow key={asset.id}>
                      <TableCell>
                        <div className="font-semibold text-slate-900 text-xs">{asset.name}</div>
                        <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">
                          {asset.category.replace("_", " ")}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-slate-600 font-mono">
                        {asset.identifier || "N/A"}
                      </TableCell>
                      <TableCell>
                        {asset.assignedTo ? (
                          <div className="flex flex-col">
                            <span className="font-medium text-slate-900 text-xs">{asset.assignedTo.name}</span>
                            <span className="text-[10px] text-slate-500">{asset.assignedTo.email}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold border ${getAssetStatusBadgeStyle(asset.status)}`}>
                          {asset.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <ManageAssetDialog
                          assetId={asset.id}
                          assetName={asset.name}
                          currentStatus={asset.status}
                          assignedToId={asset.assignedToId}
                          users={tenantUsers}
                        />
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

function getLeaveStatusVariant(status: string): "success" | "warning" | "destructive" | "secondary" {
  switch (status) {
    case "APPROVED":
      return "success"
    case "PENDING":
      return "warning"
    case "REJECTED":
      return "destructive"
    default:
      return "secondary"
  }
}

function getAssetStatusBadgeStyle(status: string): string {
  switch (status) {
    case "AVAILABLE":
      return "bg-emerald-50 text-emerald-700 border-emerald-200"
    case "ASSIGNED":
      return "bg-blue-50 text-blue-700 border-blue-200"
    case "MAINTENANCE":
      return "bg-amber-50 text-amber-700 border-amber-200"
    case "LOST":
      return "bg-red-50 text-red-700 border-red-200"
    default:
      return "bg-slate-100 text-slate-700 border-slate-200"
  }
}
