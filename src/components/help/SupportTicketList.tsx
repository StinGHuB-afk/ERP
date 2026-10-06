"use client"

import { useState } from "react"
import { TicketStatus, TicketPriority } from "@prisma/client"
import { respondToSupportTicket } from "@/app/actions/support.actions"
import {
  MessageSquare,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Send,
  Loader2,
  Filter,
  User,
  Building,
  Calendar,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"

export type TicketItem = {
  id: string
  schoolId?: string | null
  senderId: string
  senderRole: string
  targetRole: string
  targetUserId?: string | null
  category: string
  subject: string
  message: string
  status: TicketStatus
  priority: TicketPriority
  response?: string | null
  respondedAt?: Date | string | null
  createdAt: Date | string
  updatedAt: Date | string
  sender?: {
    id: string
    name?: string | null
    email: string
    role: string
  }
  respondedBy?: {
    id: string
    name?: string | null
    email: string
    role: string
  } | null
  school?: {
    id: string
    name: string
  } | null
}

type SupportTicketListProps = {
  tickets: TicketItem[]
  scope: "mine" | "incoming"
  canReply?: boolean
  title?: string
}

export function SupportTicketList({
  tickets,
  scope,
  canReply = false,
  title = scope === "mine" ? "My Submitted Tickets" : "Incoming Support Desk Tickets",
}: SupportTicketListProps) {
  const [filterStatus, setFilterStatus] = useState<string>("ALL")
  const [filterCategory, setFilterCategory] = useState<string>("ALL")
  const [selectedTicket, setSelectedTicket] = useState<TicketItem | null>(null)
  const [responseText, setResponseText] = useState("")
  const [newStatus, setNewStatus] = useState<TicketStatus>(TicketStatus.RESOLVED)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const categories = Array.from(new Set(tickets.map((t) => t.category)))

  const filteredTickets = tickets.filter((ticket) => {
    const matchesStatus = filterStatus === "ALL" || ticket.status === filterStatus
    const matchesCategory = filterCategory === "ALL" || ticket.category === filterCategory
    return matchesStatus && matchesCategory
  })

  const handleOpenDialog = (ticket: TicketItem) => {
    setSelectedTicket(ticket)
    setResponseText(ticket.response || "")
    setNewStatus(ticket.status === TicketStatus.OPEN ? TicketStatus.IN_PROGRESS : ticket.status)
    setError(null)
  }

  const handleSendResponse = async () => {
    if (!selectedTicket || !responseText.trim()) {
      setError("Please write a response before submitting.")
      return
    }

    setLoading(true)
    setError(null)
    try {
      await respondToSupportTicket(selectedTicket.id, responseText, newStatus)
      setSelectedTicket(null)
      setResponseText("")
    } catch (err: any) {
      setError(err.message || "Failed to save response.")
    } finally {
      setLoading(false)
    }
  }

  const getPriorityBadge = (p: TicketPriority) => {
    switch (p) {
      case TicketPriority.URGENT:
        return <Badge className="bg-red-600 text-white font-semibold">URGENT</Badge>
      case TicketPriority.HIGH:
        return <Badge className="bg-orange-500 text-white font-semibold">HIGH</Badge>
      case TicketPriority.MEDIUM:
        return <Badge className="bg-blue-500 text-white font-semibold">MEDIUM</Badge>
      case TicketPriority.LOW:
        return <Badge className="bg-slate-500 text-white font-semibold">LOW</Badge>
      default:
        return null
    }
  }

  const getStatusBadge = (s: TicketStatus) => {
    switch (s) {
      case TicketStatus.OPEN:
        return <Badge className="bg-amber-100 text-amber-800 border-amber-300 font-semibold">OPEN</Badge>
      case TicketStatus.IN_PROGRESS:
        return <Badge className="bg-blue-100 text-blue-800 border-blue-300 font-semibold">IN PROGRESS</Badge>
      case TicketStatus.RESOLVED:
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold">RESOLVED</Badge>
      case TicketStatus.CLOSED:
        return <Badge className="bg-slate-100 text-slate-700 border-slate-300 font-semibold">CLOSED</Badge>
      default:
        return null
    }
  }

  return (
    <div className="space-y-4">
      {/* Top Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-blue-600" />
          <h3 className="text-sm font-bold text-slate-800">{title}</h3>
          <Badge className="bg-slate-100 text-slate-700 font-semibold text-xs ml-1">
            {filteredTickets.length}
          </Badge>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <Filter className="h-3.5 w-3.5 text-slate-400" />
          <Select value={filterStatus} onValueChange={(val) => setFilterStatus(val ?? "ALL")}>
            <SelectTrigger className="h-8 text-xs w-[130px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL" className="text-xs">All Statuses</SelectItem>
              <SelectItem value="OPEN" className="text-xs">Open</SelectItem>
              <SelectItem value="IN_PROGRESS" className="text-xs">In Progress</SelectItem>
              <SelectItem value="RESOLVED" className="text-xs">Resolved</SelectItem>
              <SelectItem value="CLOSED" className="text-xs">Closed</SelectItem>
            </SelectContent>
          </Select>

          {categories.length > 0 && (
            <Select value={filterCategory} onValueChange={(val) => setFilterCategory(val ?? "ALL")}>
              <SelectTrigger className="h-8 text-xs w-[150px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL" className="text-xs">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat} className="text-xs">
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Ticket Cards */}
      {filteredTickets.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center bg-white">
          <Clock className="mx-auto h-8 w-8 text-slate-400 mb-2" />
          <p className="text-sm font-medium text-slate-600">No support tickets found</p>
          <p className="text-xs text-slate-400 mt-1">
            {scope === "mine"
              ? "You haven't submitted any help tickets yet."
              : "No incoming support tickets matching selected filters."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTickets.map((t) => (
            <div
              key={t.id}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs hover:border-slate-300 transition-all space-y-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                      {t.category}
                    </span>
                    {getPriorityBadge(t.priority)}
                    {getStatusBadge(t.status)}
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 pt-0.5">{t.subject}</h4>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleOpenDialog(t)}
                  className="h-8 text-xs text-blue-600 border-blue-200 hover:bg-blue-50"
                >
                  {canReply ? "Manage / Respond" : "View Details & Progress"}
                </Button>
              </div>

              <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed bg-slate-50/50 p-2.5 rounded-lg border border-slate-100">
                {t.message}
              </p>

              {/* Footer Meta */}
              <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 border-t border-slate-100 pt-2">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1 text-slate-500 font-medium">
                    <User className="h-3 w-3 text-slate-400" />
                    {t.sender?.name || t.senderRole} ({t.senderRole} • ID: {t.senderId.slice(0, 8).toUpperCase()})
                  </span>
                  {t.school && (
                    <span className="flex items-center gap-1 text-slate-500">
                      <Building className="h-3 w-3 text-slate-400" />
                      {t.school.name}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-slate-400" />
                    {new Date(t.createdAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>

                {t.response && (
                  <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Responded
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Ticket Detail / Response Dialog */}
      {selectedTicket && (
        <Dialog open={!!selectedTicket} onOpenChange={(open) => !open && setSelectedTicket(null)}>
          <DialogContent className="max-w-2xl text-xs">
            <DialogHeader>
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                  {selectedTicket.category}
                </span>
                {getPriorityBadge(selectedTicket.priority)}
                {getStatusBadge(selectedTicket.status)}
              </div>
              <DialogTitle className="text-base font-bold text-slate-900">
                {selectedTicket.subject}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Ticket Info */}
              <div className="rounded-lg bg-slate-50 p-3.5 border border-slate-200 text-xs space-y-2">
                <div className="flex flex-wrap items-center justify-between text-slate-600 gap-2">
                  <span>
                    <strong>From:</strong> {selectedTicket.sender?.name || "User"} ({selectedTicket.senderRole})
                    <span className="ml-1 font-mono text-[11px] text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                      ID: {selectedTicket.senderId}
                    </span>
                    {selectedTicket.sender?.email ? ` - ${selectedTicket.sender.email}` : ""}
                  </span>
                  <span>
                    <strong>Date:</strong> {new Date(selectedTicket.createdAt).toLocaleString()}
                  </span>
                </div>
                <div className="text-slate-600">
                  <strong>Target Desk:</strong> {selectedTicket.targetRole}
                  {selectedTicket.targetUserId && (
                    <span className="ml-1 font-mono text-[11px] text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                      User ID: {selectedTicket.targetUserId}
                    </span>
                  )}
                </div>
                <div className="pt-2 border-t border-slate-200 text-slate-800 leading-relaxed whitespace-pre-wrap">
                  {selectedTicket.message}
                </div>
              </div>

              {/* Existing Response */}
              {selectedTicket.response && (
                <div className="rounded-lg bg-emerald-50/80 p-3.5 border border-emerald-200 text-xs space-y-1">
                  <div className="flex items-center justify-between text-emerald-900 font-bold">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      Official Response
                      {selectedTicket.respondedBy?.name ? ` by ${selectedTicket.respondedBy.name}` : ""}
                    </span>
                    {selectedTicket.respondedAt && (
                      <span className="text-[11px] font-normal text-emerald-700">
                        {new Date(selectedTicket.respondedAt).toLocaleString()}
                      </span>
                    )}
                  </div>
                  <p className="text-emerald-950 leading-relaxed pt-1 whitespace-pre-wrap">
                    {selectedTicket.response}
                  </p>
                </div>
              )}

              {/* Reply Section (If canReply or adding update) */}
              {canReply && (
                <div className="space-y-3 pt-2 border-t border-slate-200">
                  <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <Send className="h-3.5 w-3.5 text-blue-600" />
                    {selectedTicket.response ? "Update Response / Resolution" : "Provide Response to User"}
                  </h4>

                  {error && (
                    <div className="p-2.5 rounded-md bg-red-50 text-red-700 border border-red-200 text-xs">
                      {error}
                    </div>
                  )}

                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Response Message</label>
                    <Textarea
                      rows={4}
                      placeholder="Type your official response, instructions, or resolution notes..."
                      value={responseText}
                      onChange={(e) => setResponseText(e.target.value)}
                      className="text-xs"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-48">
                      <label className="block text-slate-700 font-medium mb-1">Update Status</label>
                      <Select value={newStatus} onValueChange={(val) => setNewStatus(val as TicketStatus)}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={TicketStatus.IN_PROGRESS} className="text-xs">In Progress</SelectItem>
                          <SelectItem value={TicketStatus.RESOLVED} className="text-xs">Resolved</SelectItem>
                          <SelectItem value={TicketStatus.CLOSED} className="text-xs">Closed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" size="sm" onClick={() => setSelectedTicket(null)}>
                Close
              </Button>
              {canReply && (
                <Button
                  size="sm"
                  onClick={handleSendResponse}
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                      Saving Response...
                    </>
                  ) : (
                    "Save & Send Response"
                  )}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
