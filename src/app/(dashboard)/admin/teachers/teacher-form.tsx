"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { createTeacher } from "@/app/actions/admin"
import { AlertCircle, Loader2, Plus } from "lucide-react"

export function TeacherForm() {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")
  const router = useRouter()

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError("")

    if (!name.trim() || !email.trim()) {
      setError("Please fill out all required fields.")
      return
    }

    const formData = new FormData()
    formData.append("name", name.trim())
    formData.append("email", email.trim().toLowerCase())

    startTransition(async () => {
      const res = await createTeacher(formData)
      if (res.error) {
        setError(res.error)
      } else {
        setName("")
        setEmail("")
        setOpen(false)
        router.refresh()
      }
    })
  }

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs h-9 px-4 rounded-md shadow-subtle flex items-center gap-1.5"
      >
        <Plus className="h-4 w-4" />
        <span>Add Teacher</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-white border border-slate-200 rounded-lg p-6 max-w-md">
          <DialogHeader className="border-b border-slate-200 pb-3 mb-2">
            <DialogTitle className="text-base font-semibold text-slate-900">Add New Teacher</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3 flex items-center gap-2 text-xs text-red-700 font-medium">
                <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Single Column Field 1 */}
            <div>
              <Label htmlFor="teacher-modal-name">
                Full Name <span className="text-red-600">*</span>
              </Label>
              <Input
                id="teacher-modal-name"
                name="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Dr. Jane Smith"
                required
                disabled={isPending}
              />
              <p className="text-[11px] text-slate-400 mt-1">Official faculty member name for rosters.</p>
            </div>

            {/* Single Column Field 2 */}
            <div>
              <Label htmlFor="teacher-modal-email">
                Email Address <span className="text-red-600">*</span>
              </Label>
              <Input
                id="teacher-modal-email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. jsmith@school.local"
                required
                disabled={isPending}
              />
              <p className="text-[11px] text-slate-400 mt-1">Primary contact and login credential email.</p>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                className="bg-white hover:bg-slate-100 text-slate-700 border-slate-200 text-xs font-medium h-9"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs h-9 px-4 rounded-md shadow-subtle"
              >
                {isPending ? (
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Creating...
                  </span>
                ) : (
                  "Create Teacher"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
