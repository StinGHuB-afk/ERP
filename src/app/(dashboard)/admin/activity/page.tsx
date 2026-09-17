import prisma from "@/lib/prisma"
import { ShieldAlert, Activity } from "lucide-react"

export default async function AdminActivityPage() {
  const logs = await prisma.activityLog.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      user: true,
      actor: true,
    },
    take: 100
  })

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-slate-800 text-white rounded-lg shadow-sm">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Audit & Activity Log</h1>
          <p className="text-slate-500 text-sm">System-wide immutable security audit logs and administrative actions.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-slate-500" />
            <h2 className="text-sm font-semibold text-slate-700">Recent Telemetry</h2>
          </div>
          <span className="text-xs font-mono text-slate-400">Total Records: {logs.length}</span>
        </div>

        <div className="divide-y divide-slate-100">
          {logs.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              No activity logs recorded yet.
            </div>
          ) : (
            logs.map((log) => {
              const userInfo = log.user || log.actor
              const displayName = userInfo?.name || userInfo?.email || "System User"
              const displayAction = (log.actionType || log.action || "ACTIVITY").replace(/_/g, ' ')

              return (
                <div key={log.id} className="p-4 flex items-start gap-4 hover:bg-slate-50/50 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 text-xs font-bold text-slate-600">
                    {displayName.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1">
                      <p className="text-sm font-medium text-slate-900">
                        {displayName} <span className="text-slate-500 font-normal">performed</span> {displayAction}
                      </p>
                      <time className="text-xs text-slate-400 whitespace-nowrap">
                        {log.createdAt.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </time>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
