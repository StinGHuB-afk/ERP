"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  updateAdmissionStatus,
  approveAndConvertAdmission,
} from "@/app/actions/admission.actions"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  CheckCircle2,
  XCircle,
  FileSearch,
  UserCheck,
  Copy,
  Check,
  AlertCircle,
  Mail,
  Phone,
  Calendar,
} from "lucide-react"

interface EnquiryProp {
  id: string
  referenceNumber: string
  studentFirstName: string
  studentLastName: string
  dateOfBirth: Date | string
  appliedForClass: { id: string; name: string }
  parentName: string
  parentEmail: string
  parentPhone: string
  status: string
  documentUrl?: string | null
  adminNotes?: string | null
  createdAt: Date | string
}

interface ManageApplicationDialogProps {
  enquiry: EnquiryProp
}

interface CredentialsResult {
  email: string
  tempPassword: string
  studentName: string
  referenceNumber: string
}

export function ManageApplicationDialog({ enquiry }: ManageApplicationDialogProps) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [convertedCredentials, setConvertedCredentials] =
    useState<CredentialsResult | null>(null)
  const [copied, setCopied] = useState(false)
  const router = useRouter()

  const handleReviewing = () => {
    setError(null)
    startTransition(async () => {
      try {
        await updateAdmissionStatus(enquiry.id, "REVIEWING")
        setOpen(false)
        router.refresh()
      } catch (err: unknown) {
        if (err instanceof Error) setError(err.message)
        else setError("Failed to update status to REVIEWING.")
      }
    })
  }

  const handleReject = () => {
    setError(null)
    startTransition(async () => {
      try {
        await updateAdmissionStatus(enquiry.id, "REJECTED")
        setOpen(false)
        router.refresh()
      } catch (err: unknown) {
        if (err instanceof Error) setError(err.message)
        else setError("Failed to reject application.")
      }
    })
  }

  const handleApproveAndConvert = () => {
    setError(null)
    startTransition(async () => {
      try {
        const res = await approveAndConvertAdmission(enquiry.id)
        if (res.success) {
          setConvertedCredentials({
            email: res.email,
            tempPassword: res.tempPassword,
            studentName: res.studentName,
            referenceNumber: res.referenceNumber,
          })
          router.refresh()
        }
      } catch (err: unknown) {
        if (err instanceof Error) setError(err.message)
        else setError("Failed to approve and convert admission.")
      }
    })
  }

  const copyCredentials = () => {
    if (!convertedCredentials) return
    const text = `Student Account Created:\nName: ${convertedCredentials.studentName}\nEmail: ${convertedCredentials.email}\nPassword: ${convertedCredentials.tempPassword}`
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const isApproved = enquiry.status === "APPROVED" || convertedCredentials !== null

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" variant="outline" className="h-7 text-xs">
            Manage Application
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between pr-4">
            <span>Admission Application</span>
            <span className="font-mono text-xs text-slate-500 font-semibold bg-slate-100 px-2 py-0.5 rounded">
              {enquiry.referenceNumber}
            </span>
          </DialogTitle>
          <DialogDescription>
            Review application details and execute administrative status transitions.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {error && (
            <div className="flex items-start gap-2 rounded-md border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Success Credentials Box after Conversion */}
          {convertedCredentials && (
            <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-4 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-800 flex items-center gap-1.5 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Student Account Provisioned!
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs gap-1 border-emerald-300 text-emerald-800 hover:bg-emerald-100"
                  onClick={copyCredentials}
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copied ? "Copied" : "Copy Logins"}</span>
                </Button>
              </div>
              <p className="text-slate-600 text-[11px]">
                The applicant has been converted to an active Student. Provide these login details to the parent:
              </p>
              <div className="bg-white p-2.5 rounded border border-emerald-200 font-mono text-[11px] space-y-1">
                <div>
                  <span className="text-slate-500 font-sans">Login Email: </span>
                  <span className="font-semibold text-slate-900">{convertedCredentials.email}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-sans">Temp Password: </span>
                  <span className="font-semibold text-slate-900">{convertedCredentials.tempPassword}</span>
                </div>
              </div>
            </div>
          )}

          {/* Application Details Summary */}
          <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3.5 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-900 text-sm">
                {enquiry.studentFirstName} {enquiry.studentLastName}
              </span>
              <Badge variant="outline" className="text-[10px]">
                Class {enquiry.appliedForClass.name}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-2 text-slate-600 pt-1 border-t border-slate-200/60">
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                <span suppressHydrationWarning>
                  DOB: {new Date(enquiry.dateOfBirth).toLocaleDateString()}
                </span>
              </div>
              <div>
                <span className="text-slate-500">Parent: </span>
                <span className="font-medium text-slate-800">{enquiry.parentName}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-slate-400" />
                <span className="truncate">{enquiry.parentEmail}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-slate-400" />
                <span>{enquiry.parentPhone}</span>
              </div>
            </div>
          </div>

          {/* Status-Based Action Controls */}
          {!isApproved && enquiry.status !== "REJECTED" && (
            <div className="space-y-2 pt-1 border-t border-slate-100">
              <h4 className="text-xs font-semibold text-slate-700">Administrative Actions</h4>
              <div className="flex flex-col gap-2 sm:flex-row">
                {enquiry.status === "PENDING" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 text-xs gap-1.5 border-blue-200 text-blue-700 hover:bg-blue-50"
                    disabled={isPending}
                    onClick={handleReviewing}
                  >
                    <FileSearch className="h-3.5 w-3.5" />
                    Mark as Reviewing
                  </Button>
                )}

                <Button
                  size="sm"
                  className="flex-1 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                  disabled={isPending}
                  onClick={handleApproveAndConvert}
                >
                  <UserCheck className="h-3.5 w-3.5" />
                  Approve & Convert to Student
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs gap-1.5 border-rose-200 text-rose-700 hover:bg-rose-50"
                  disabled={isPending}
                  onClick={handleReject}
                >
                  <XCircle className="h-3.5 w-3.5" />
                  Reject
                </Button>
              </div>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
