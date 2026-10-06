"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createClass } from "@/app/actions/admin"

export function ClassForm({ teachers }: { teachers: { id: string, name: string | null, assignedClass?: string | null }[] }) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState("")
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>("none")
  const router = useRouter()

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError("")
    const formData = new FormData(e.currentTarget)
    
    // Convert empty teacherId to null or don't append it
    if (formData.get("teacherId") === "none") {
      formData.delete("teacherId")
    }

    startTransition(async () => {
      const res = await createClass(formData)
      if (res.error) {
        setError(res.error)
      } else {
        setOpen(false)
        router.refresh()
      }
    })
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>Add Class</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Class</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Class Name</Label>
            <Input id="name" name="name" required placeholder="e.g. Grade 10 - A" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="teacherId">Class Teacher</Label>
            <Select name="teacherId" value={selectedTeacherId} onValueChange={(v) => setSelectedTeacherId(v ?? "none")}>
              <SelectTrigger>
                <SelectValue placeholder="Select a teacher" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {teachers.map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {(() => {
              if (selectedTeacherId !== "none") {
                const teacherObj = teachers.find(t => t.id === selectedTeacherId)
                if (teacherObj && teacherObj.assignedClass) {
                  return (
                    <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-md p-2 mt-2 flex items-start gap-1.5">
                      <div>⚠️</div>
                      <div>
                        <strong>Warning:</strong> This teacher is currently assigned to <strong>{teacherObj.assignedClass}</strong>. 
                        They will be removed from their old class if you proceed.
                      </div>
                    </div>
                  )
                }
              }
              return null
            })()}
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={isPending} className="w-full">
            {isPending ? "Creating..." : "Create Class"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
    </>
  )
}
