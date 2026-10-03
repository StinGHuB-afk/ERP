import { verifySession } from "@/lib/auth/session"
import { redirect } from "next/navigation"
import { Settings, Server, ShieldCheck, Mail, Database } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function SuperAdminSettingsPage() {
  const session = await verifySession()
  if (!session || session.role !== "SUPERADMIN") {
    redirect("/")
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">
          Global System Settings
        </h1>
        <p className="text-xs text-slate-500">
          Manage platform-wide configurations, email gateways, and database maintenance.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Email Gateway Card */}
        <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm hover:border-blue-300 transition-colors">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-sm">Email Gateway</h3>
              <p className="text-[11px] text-slate-500">SMTP and SendGrid configuration</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center">
            <span className="text-[10px] uppercase font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">Active</span>
            <button className="text-xs font-medium text-blue-600 hover:text-blue-800">Configure &rarr;</button>
          </div>
        </div>

        {/* Database Health Card */}
        <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm hover:border-blue-300 transition-colors">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 bg-purple-50 text-purple-600 rounded-lg">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-sm">Database Maintenance</h3>
              <p className="text-[11px] text-slate-500">Turso edge database metrics</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center">
            <span className="text-[10px] uppercase font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">Healthy</span>
            <button className="text-xs font-medium text-blue-600 hover:text-blue-800">View Metrics &rarr;</button>
          </div>
        </div>

        {/* Security Policies Card */}
        <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm hover:border-blue-300 transition-colors">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 bg-rose-50 text-rose-600 rounded-lg">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-sm">Security Policies</h3>
              <p className="text-[11px] text-slate-500">Password rules and 2FA</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center">
            <span className="text-[10px] uppercase font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded">Standard</span>
            <button className="text-xs font-medium text-blue-600 hover:text-blue-800">Manage &rarr;</button>
          </div>
        </div>
      </div>
    </div>
  )
}
