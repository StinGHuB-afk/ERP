"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Briefcase, Plus, Calendar, Clock, CheckCircle2, XCircle } from "lucide-react"
import { createLeaveRequest } from "@/app/actions/operations.actions"
import { LeaveType } from "@prisma/client"
import { toast } from "sonner"

export function TeacherLeaveClient({ leaveRequests }: { leaveRequests: any[] }) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showForm, setShowForm] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsSubmitting(true)

    const formData = new FormData(e.currentTarget)
    const type = formData.get("type") as LeaveType
    const startDate = formData.get("startDate") as string
    const endDate = formData.get("endDate") as string
    const reason = formData.get("reason") as string

    try {
      await createLeaveRequest({ type, startDate, endDate, reason })
      toast.success("Leave request submitted successfully!")
      setShowForm(false)
      ;(e.target as HTMLFormElement).reset()
    } catch (err: any) {
      toast.error(err.message || "Failed to submit leave request.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const pendingCount = leaveRequests.filter((r) => r.status === "PENDING").length
  const approvedCount = leaveRequests.filter((r) => r.status === "APPROVED").length
  const rejectedCount = leaveRequests.filter((r) => r.status === "REJECTED").length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Leave Requests</h1>
          <p className="text-sm text-slate-500">Apply for leave and view status of your applications.</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="gap-2">
          <Plus className="w-4 h-4" />
          {showForm ? "Cancel" : "Apply for Leave"}
        </Button>
      </div>

      {/* Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Pending Requests</CardTitle>
            <Clock className="w-4 h-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{pendingCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Approved Leaves</CardTitle>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{approvedCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Rejected Requests</CardTitle>
            <XCircle className="w-4 h-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-600">{rejectedCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Leave Application Form */}
      {showForm && (
        <Card className="border-blue-200 bg-blue-50/20">
          <CardHeader>
            <CardTitle className="text-base font-semibold">New Leave Application</CardTitle>
            <CardDescription>Submit dates and details for administrative review.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
              <div className="space-y-1.5">
                <Label htmlFor="type">Leave Type</Label>
                <select
                  id="type"
                  name="type"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  required
                >
                  <option value="SICK">Sick Leave</option>
                  <option value="CASUAL">Casual Leave</option>
                  <option value="MATERNITY">Maternity Leave</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input type="date" id="startDate" name="startDate" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="endDate">End Date</Label>
                  <Input type="date" id="endDate" name="endDate" required />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="reason">Reason for Leave</Label>
                <Input
                  id="reason"
                  name="reason"
                  placeholder="Provide a brief explanation..."
                  required
                />
              </div>

              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? "Submitting..." : "Submit Application"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* History Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Leave History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-600 font-medium">
                <tr>
                  <th className="p-3">Type</th>
                  <th className="p-3">Dates</th>
                  <th className="p-3">Reason</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Reviewed By</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {leaveRequests.map((req) => (
                  <tr key={req.id}>
                    <td className="p-3 font-medium text-slate-900">{req.type}</td>
                    <td className="p-3 text-slate-600">
                      {new Date(req.startDate).toLocaleDateString()} -{" "}
                      {new Date(req.endDate).toLocaleDateString()}
                    </td>
                    <td className="p-3 text-slate-600">{req.reason}</td>
                    <td className="p-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                          req.status === "APPROVED"
                            ? "bg-emerald-100 text-emerald-800"
                            : req.status === "REJECTED"
                            ? "bg-rose-100 text-rose-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {req.status}
                      </span>
                    </td>
                    <td className="p-3 text-slate-500">
                      {req.reviewer?.name || req.reviewer?.email || "Pending"}
                    </td>
                  </tr>
                ))}
                {leaveRequests.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-slate-500">
                      No leave requests submitted yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
