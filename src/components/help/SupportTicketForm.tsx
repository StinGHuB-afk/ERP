"use client"

import { useState } from "react"
import { Role, TicketPriority } from "@prisma/client"
import { createSupportTicket } from "@/app/actions/support.actions"
import { Send, CheckCircle2, AlertCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type TeacherOption = {
  userId: string
  teacherId?: string
  name: string
  email: string
}

type SupportTicketFormProps = {
  userRole: Role | "SUPERADMIN" | "ADMIN" | "TEACHER" | "STUDENT" | "PARENT" | "LIBRARIAN"
  availableTargetRoles: Role[]
  teachersList?: TeacherOption[]
  categories?: string[]
  onSuccess?: () => void
}

const DEFAULT_CATEGORIES = [
  "Academics & Grading",
  "Portal Access & Login",
  "Classroom & Attendance",
  "Finance & Fees",
  "Library & Books",
  "Transport & Routes",
  "Platform Bug / Technical",
  "General Inquiry",
]

export function SupportTicketForm({
  userRole,
  availableTargetRoles,
  teachersList = [],
  categories = DEFAULT_CATEGORIES,
  onSuccess,
}: SupportTicketFormProps) {
  const [targetRole, setTargetRole] = useState<Role>(availableTargetRoles[0] || Role.ADMIN)
  const [targetUserId, setTargetUserId] = useState<string>("")
  const [category, setCategory] = useState<string>(categories[0] || "General Inquiry")
  const [priority, setPriority] = useState<TicketPriority>(TicketPriority.MEDIUM)
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!subject.trim() || !message.trim()) {
      setError("Please fill in both subject and detailed description.")
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      await createSupportTicket({
        category,
        subject,
        message,
        targetRole,
        priority,
        targetUserId: targetRole === Role.TEACHER && targetUserId ? targetUserId : undefined,
      })

      setSuccess(true)
      setSubject("")
      setMessage("")
      if (onSuccess) onSuccess()
    } catch (err: any) {
      setError(err.message || "Failed to submit support ticket. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
      <div className="mb-5 pb-4 border-b border-slate-100">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Send className="h-4 w-4 text-blue-600" />
          Submit Support Ticket / Inquiry
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          Send a direct query to the responsible desk or staff member. You will receive progress notifications.
        </p>
      </div>

      {success && (
        <div className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-800 flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Support Ticket Submitted Successfully!</p>
            <p className="mt-0.5 text-emerald-700">
              Your inquiry has been routed to the {targetRole} desk. You can track the status in the My Tickets tab below.
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-xs text-red-800 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Submission Error</p>
            <p className="mt-0.5 text-red-700">{error}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Target Role */}
          {availableTargetRoles.length > 1 ? (
            <div>
              <Label className="text-xs font-semibold text-slate-700">Route Inquiry To</Label>
              <Select value={targetRole} onValueChange={(val) => setTargetRole(val as Role)}>
                <SelectTrigger className="mt-1 h-9 text-xs">
                  <SelectValue placeholder="Select target role" />
                </SelectTrigger>
                <SelectContent>
                  {availableTargetRoles.map((r) => (
                    <SelectItem key={r} value={r} className="text-xs">
                      {r === Role.SUPERADMIN
                        ? "Platform Superadmin (Tech Support)"
                        : r === Role.ADMIN
                        ? "School Administration Desk"
                        : r === Role.TEACHER
                        ? "Teacher / Class Teacher"
                        : r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div>
              <Label className="text-xs font-semibold text-slate-700">Recipient Desk</Label>
              <Input
                readOnly
                value={
                  targetRole === Role.SUPERADMIN
                    ? "Platform Superadmin (Tech Support)"
                    : targetRole === Role.ADMIN
                    ? "School Administration Desk"
                    : targetRole === Role.TEACHER
                    ? "Teacher / Academic Staff"
                    : String(targetRole)
                }
                className="mt-1 h-9 text-xs bg-slate-50 text-slate-600 cursor-not-allowed"
              />
            </div>
          )}

          {/* Target Teacher Selection if role is TEACHER */}
          {targetRole === Role.TEACHER && teachersList.length > 0 && (
            <div>
              <Label className="text-xs font-semibold text-slate-700">Select Specific Teacher (Optional)</Label>
              <Select value={targetUserId} onValueChange={(val) => setTargetUserId(val ?? "")}>
                <SelectTrigger className="mt-1 h-9 text-xs">
                  <SelectValue placeholder="All Class & Subject Teachers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">
                    All Teachers / Unassigned
                  </SelectItem>
                  {teachersList.map((t) => (
                    <SelectItem key={t.userId} value={t.userId} className="text-xs">
                      {t.name} (Teacher ID: TCH-{(t.teacherId || t.userId).slice(0, 8).toUpperCase()} • {t.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Category */}
          <div>
            <Label className="text-xs font-semibold text-slate-700">Issue Category</Label>
            <Select value={category} onValueChange={(val) => setCategory(val ?? "")}>
              <SelectTrigger className="mt-1 h-9 text-xs">
                <SelectValue placeholder="Select Category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat} className="text-xs">
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Priority */}
          <div>
            <Label className="text-xs font-semibold text-slate-700">Priority Level</Label>
            <Select value={priority} onValueChange={(val) => setPriority(val as TicketPriority)}>
              <SelectTrigger className="mt-1 h-9 text-xs">
                <SelectValue placeholder="Select Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TicketPriority.LOW} className="text-xs">Low (General question)</SelectItem>
                <SelectItem value={TicketPriority.MEDIUM} className="text-xs">Medium (Standard request)</SelectItem>
                <SelectItem value={TicketPriority.HIGH} className="text-xs">High (Urgent action needed)</SelectItem>
                <SelectItem value={TicketPriority.URGENT} className="text-xs">Urgent (Critical issue)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Subject */}
        <div>
          <Label className="text-xs font-semibold text-slate-700">Subject / Brief Summary</Label>
          <Input
            type="text"
            placeholder="e.g., Unable to submit leave request / Grade entry error in Class 10"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="mt-1 h-9 text-xs"
            required
          />
        </div>

        {/* Message */}
        <div>
          <Label className="text-xs font-semibold text-slate-700">Detailed Description</Label>
          <Textarea
            rows={4}
            placeholder="Provide all relevant details, class name, student ID, error message or specific request details..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="mt-1 text-xs"
            required
          />
        </div>

        {/* Action Button */}
        <div className="flex justify-end pt-2">
          <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs h-9 px-5">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                Submitting Ticket...
              </>
            ) : (
              <>
                <Send className="mr-2 h-3.5 w-3.5" />
                Submit Ticket
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
