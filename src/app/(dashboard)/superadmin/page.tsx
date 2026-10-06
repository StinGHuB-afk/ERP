import { getSchools } from "@/app/actions/tenant.actions"
import { CreateSchoolDialog } from "./components/create-school-dialog"
import { ProvisionAdminDialog } from "./components/provision-admin-dialog"
import { ManageModulesDialog } from "./components/manage-modules-dialog"
import { ViewTenantAdminsDialog } from "./components/view-tenant-admins-dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Building2, Globe, MapPin, Users, BookOpen } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function SuperAdminSchoolsPage() {
  const schools = await getSchools()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Tenant Management
          </h1>
          <p className="text-xs text-slate-500">
            Manage multi-tenant school instances, provision domains, and review organization metrics.
          </p>
        </div>
        <CreateSchoolDialog />
      </div>

      {/* Overview Metric Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-md bg-blue-50 p-2 text-blue-600">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                Total Schools
              </p>
              <p className="text-lg font-bold text-slate-900">{schools.length}</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-md bg-slate-100 p-2 text-slate-600">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                Total Tenant Users
              </p>
              <p className="text-lg font-bold text-slate-900">
                {schools.reduce((acc, s) => acc + (s._count?.users || 0), 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-md bg-emerald-50 p-2 text-emerald-600">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                Active Classes
              </p>
              <p className="text-lg font-bold text-slate-900">
                {schools.reduce((acc, s) => acc + (s._count?.classes || 0), 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Schools Table */}
      <div className="rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
            Registered School Tenants
          </h2>
        </div>

        {schools.length === 0 ? (
          <div className="p-8 text-center">
            <Building2 className="mx-auto h-8 w-8 text-slate-400" />
            <h3 className="mt-2 text-sm font-semibold text-slate-800">No schools provisioned yet</h3>
            <p className="mt-1 text-xs text-slate-500">
              Click &quot;Create School&quot; above to register your first tenant workspace.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>School Name</TableHead>
                <TableHead>Domain / Location</TableHead>
                <TableHead className="text-center">Total Users</TableHead>
                <TableHead className="text-center">Total Classes</TableHead>
                <TableHead>Created Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {schools.map((school) => (
                <TableRow key={school.id}>
                  <TableCell className="font-semibold text-slate-900">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-50 text-blue-700 font-bold text-xs">
                        {school.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 text-sm">{school.name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">ID: {school.id}</div>

                        {/* Detailed Role Breakdown Chips */}
                        <div className="flex flex-wrap items-center gap-1 mt-1.5 max-w-md">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-900">
                            👥 {school.userCounts?.total ?? 0} Total Users
                          </span>
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Teachers: {school.userCounts?.teachers ?? 0}
                          </span>
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            Students: {school.userCounts?.students ?? 0}
                          </span>
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            Parents: {school.userCounts?.parents ?? 0}
                          </span>
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                            Librarians: {school.userCounts?.librarians ?? 0}
                          </span>
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                            Admins: {school.userCounts?.admins ?? 0}
                          </span>
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-0.5">
                      {school.domain && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-600">
                          <Globe className="h-3.5 w-3.5 text-slate-400" />
                          <span>{school.domain}</span>
                        </div>
                      )}
                      {school.address && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <MapPin className="h-3.5 w-3.5 text-slate-400" />
                          <span>{school.address}</span>
                        </div>
                      )}
                      {!school.domain && !school.address && (
                        <span className="text-xs text-slate-400 italic">Not configured</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex flex-col items-center">
                      <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-800">
                        {school.userCounts?.total ?? school._count?.users ?? 0}
                      </span>
                      <span className="text-[10px] text-slate-400 mt-0.5">All Roles</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-800">
                      {school._count?.classes ?? 0}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-slate-500" suppressHydrationWarning>
                    {new Date(school.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end items-center">
                      <ProvisionAdminDialog
                        schoolId={school.id}
                        schoolName={school.name}
                      />
                      <ManageModulesDialog
                        schoolId={school.id}
                        schoolName={school.name}
                      />
                      <ViewTenantAdminsDialog
                        schoolId={school.id}
                        schoolName={school.name}
                      />
                    </div>
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
