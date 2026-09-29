import { getAdminAlerts, markAlertAsRead } from "@/app/actions/notification.actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AlertCircle, AlertTriangle, Info, Bell, CheckCircle2 } from "lucide-react"

export const dynamic = "force-dynamic"

function formatRelativeTime(date: Date) {
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  
  if (diffInSeconds < 60) return "Just now"
  
  const diffInMinutes = Math.floor(diffInSeconds / 60)
  if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`
  
  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`
  
  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays < 30) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`
  
  return date.toLocaleDateString()
}

export default async function AdminAlertsPage() {
  const alerts = await getAdminAlerts()

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">System Alerts</h1>
        <p className="text-sm text-slate-500">View and manage notifications and system alerts.</p>
      </div>

      <Card className="shadow-sm border-slate-200">
        <CardHeader className="bg-slate-50 border-b border-slate-100 flex flex-row items-center gap-2 pb-4">
          <Bell className="w-5 h-5 text-slate-500" />
          <CardTitle className="text-base font-semibold text-slate-800 m-0">Inbox</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]"></TableHead>
                <TableHead>Alert Details</TableHead>
                <TableHead className="text-right">Time</TableHead>
                <TableHead className="text-right w-[140px]">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {alerts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-slate-500 py-12">
                    No alerts found. You&apos;re all caught up!
                  </TableCell>
                </TableRow>
              ) : (
                alerts.map((alert) => {
                  const isRead = alert.isRead
                  const markReadAction = markAlertAsRead.bind(null, alert.id)

                  let Icon = Info
                  let iconColor = "text-blue-500"
                  let bgColor = "bg-blue-50"

                  if (alert.type === "URGENT") {
                    Icon = AlertCircle
                    iconColor = "text-red-600"
                    bgColor = "bg-red-50"
                  } else if (alert.type === "WARNING") {
                    Icon = AlertTriangle
                    iconColor = "text-amber-500"
                    bgColor = "bg-amber-50"
                  }

                  return (
                    <TableRow key={alert.id} className={`${isRead ? 'opacity-60 bg-slate-50' : 'bg-white'}`}>
                      <TableCell className="align-top pt-4">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isRead ? 'bg-slate-100' : bgColor}`}>
                          {isRead ? (
                            <CheckCircle2 className="w-4 h-4 text-slate-400" />
                          ) : (
                            <Icon className={`w-4 h-4 ${iconColor}`} />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="align-top pt-4">
                        <div className="flex flex-col gap-1">
                          <span className={`font-semibold ${isRead ? 'text-slate-600' : 'text-slate-900'}`}>
                            {alert.title}
                          </span>
                          <span className="text-sm text-slate-500">
                            {alert.message}
                          </span>
                          <span className="text-xs text-slate-400 mt-1">
                            From: {alert.creatorName}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="align-top pt-4 text-right text-sm text-slate-500 whitespace-nowrap">
                        {formatRelativeTime(alert.createdAt)}
                      </TableCell>
                      <TableCell className="align-top pt-3 text-right">
                        {!isRead ? (
                          <form action={markReadAction}>
                            <Button type="submit" variant="outline" size="sm" className="h-8 text-xs font-medium">
                              Mark as Read
                            </Button>
                          </form>
                        ) : (
                          <span className="text-xs text-slate-400 font-medium px-3 py-1">Read</span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
