import { getPayrollDashboardData } from "@/app/actions/payroll.actions"
import { PayrollDashboardClient } from "./components/PayrollDashboardClient"
import { getTenantModules } from "@/app/actions/entitlements.actions"
import { LockedModuleTeaser } from "@/components/ui/locked-module-teaser"

export const dynamic = "force-dynamic"

export default async function AdminPayrollPage() {
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
