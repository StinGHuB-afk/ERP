import { getPayrollDashboardData } from "@/app/actions/payroll.actions"
import { PayrollDashboardClient } from "./components/PayrollDashboardClient"
import { getTenantModules } from "@/app/actions/entitlements.actions"
import { LockedModuleTeaser } from "@/components/ui/locked-module-teaser"
import { verifySession } from "@/lib/auth/session"
import { ShieldAlert } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function AdminPayrollPage() {
  const session = await verifySession()

  if (session?.role === "SUPERADMIN") {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-8 text-center max-w-xl mx-auto my-12 space-y-4 shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600 border border-amber-200">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-900">Tenant Financial Privacy Protection</h2>
          <p className="mt-1 text-xs text-slate-500 leading-relaxed">
            Staff salary structures and monthly payroll records are confidential tenant assets. Access is restricted exclusively to local School Administrators (<span className="font-semibold text-slate-700">ADMIN</span> role).
          </p>
        </div>
      </div>
    )
  }

  const modules = await getTenantModules()
  
  if (!modules["PAYROLL"]) {
    return <LockedModuleTeaser moduleName="Salary & Payroll Management" />
  }

  const data = await getPayrollDashboardData()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">
          Salary & Payroll Engine
        </h1>
        <p className="text-xs text-slate-500">
          Manage staff salary structures, generate monthly payroll runs, and execute automated payouts to the master ledger.
        </p>
      </div>

      <PayrollDashboardClient initialData={data} />
    </div>
  )
}
