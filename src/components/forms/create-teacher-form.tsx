"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createTeacher } from "@/app/actions/admin"
import { AlertCircle, CheckCircle, Loader2 } from "lucide-react"

interface CreateTeacherFormProps {
  onSuccess?: () => void
}

/**
 * Enterprise Single-Column Create Teacher Form
 * - Persistent Labels positioned directly above solid white inputs
 * - Strict Single-Column Layout for scannability
 * - Accessible Inline Error States with explicit explanatory text
 * - Zero disappearing placeholders or glassmorphic styling
 */
export function CreateTeacherForm({ onSuccess }: CreateTeacherFormProps) {
  const [isPending, startTransition] = useTransition()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; email?: string; form?: string }>({})
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const router = useRouter()

  const validateForm = () => {
    const errors: { name?: string; email?: string } = {}
    if (!name.trim() || name.trim().length < 2) {
      errors.name = "Full name is required (minimum 2 characters)."
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = "Please enter a valid school email address (e.g. teacher@school.com)."
    }
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setFieldErrors({})
    setSuccessMessage(null)

    if (!validateForm()) return

    const formData = new FormData()
    formData.append("name", name.trim())
    formData.append("email", email.trim().toLowerCase())

    startTransition(async () => {
      const res = await createTeacher(formData)
      if (res.error) {
        setFieldErrors({ form: res.error })
      } else {
        setSuccessMessage("Teacher account successfully created.")
        setName("")
        setEmail("")
        router.refresh()
        if (onSuccess) onSuccess()
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md w-full bg-white p-6 rounded-lg border border-slate-200 shadow-subtle">
      <div className="border-b border-slate-200 pb-3 mb-2">
        <h3 className="text-base font-semibold text-slate-900">Add New Teacher</h3>
        <p className="text-xs text-slate-500 mt-0.5">Register a new faculty member account in the ERP system.</p>
      </div>

      {/* General Form Error Alert */}
      {fieldErrors.form && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3 flex items-center gap-2 text-xs text-red-700 font-medium">
          <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
          <span>{fieldErrors.form}</span>
        </div>
      )}

      {/* Success Notification */}
      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-md p-3 flex items-center gap-2 text-xs text-emerald-700 font-medium">
          <CheckCircle className="h-4 w-4 text-emerald-600 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Field 1: Full Name — Single Column with Persistent Label */}
      <div>
        <Label htmlFor="teacher-name">
          Full Name <span className="text-red-600">*</span>
        </Label>
        <Input
          id="teacher-name"
          name="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Dr. John Smith"
          aria-invalid={!!fieldErrors.name}
          disabled={isPending}
        />
        {fieldErrors.name ? (
          <p className="text-xs text-red-600 font-medium flex items-center gap-1.5 mt-1">
            <AlertCircle className="h-3.5 w-3.5 text-red-600 flex-shrink-0" />
            <span>{fieldErrors.name}</span>
          </p>
        ) : (
          <p className="text-[11px] text-slate-400 mt-1">Enter the official full name for roster displays.</p>
        )}
      </div>

      {/* Field 2: Email Address — Single Column with Persistent Label */}
      <div>
        <Label htmlFor="teacher-email">
          Email Address <span className="text-red-600">*</span>
        </Label>
        <Input
          id="teacher-email"
          name="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="e.g. jsmith@school.local"
          aria-invalid={!!fieldErrors.email}
          disabled={isPending}
        />
        {fieldErrors.email ? (
          <p className="text-xs text-red-600 font-medium flex items-center gap-1.5 mt-1">
            <AlertCircle className="h-3.5 w-3.5 text-red-600 flex-shrink-0" />
            <span>{fieldErrors.email}</span>
          </p>
        ) : (
          <p className="text-[11px] text-slate-400 mt-1">Used for system login and administrative notices.</p>
        )}
      </div>

      {/* Submit Action */}
      <div className="pt-2">
        <Button
          type="submit"
          disabled={isPending}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs h-9 rounded-md shadow-subtle transition-colors flex items-center justify-center gap-2"
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Creating Teacher Profile...</span>
            </>
          ) : (
            <span>Create Teacher Account</span>
          )}
        </Button>
      </div>
    </form>
  )
}
