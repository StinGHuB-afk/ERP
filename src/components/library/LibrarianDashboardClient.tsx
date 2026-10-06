"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { BookOpen, Activity, AlertCircle, DollarSign, PlusCircle } from "lucide-react"
import { upsertBook, borrowBook, returnBook } from "@/app/actions/library.actions"
import { toast } from "sonner"

import { LibrarianAlertModal } from "./LibrarianAlertModal"

export function LibrarianDashboardClient({ books, borrowRecords, schoolId }: any) {
  const [activeTab, setActiveTab] = useState("catalog")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Metrics
  const totalTitles = books.length
  const currentlyBorrowed = borrowRecords.filter((r: any) => r.status === "BORROWED").length
  const overdueBooks = borrowRecords.filter((r: any) => r.status === "BORROWED" && new Date(r.dueDate) < new Date()).length
  const totalFines = borrowRecords.reduce((sum: number, r: any) => sum + (r.fineAmount || 0), 0)

  async function handleAddBook(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsSubmitting(true)
    const formData = new FormData(e.currentTarget)
    formData.append("schoolId", schoolId)
    
    const res = await upsertBook(formData)
    if ((res as any)?.error) {
      toast.error((res as any).error)
    } else {
      toast.success("Book added successfully")
      ;(e.target as HTMLFormElement).reset()
    }
    setIsSubmitting(false)
  }

  async function handleReturn(recordId: string, isLost: boolean) {
    const fineAmount = isLost ? 50 : 0 // Example static fine for lost book
    const res = await returnBook(recordId, isLost, fineAmount)
    if ((res as any)?.error) {
      toast.error((res as any).error)
    } else {
      toast.success(isLost ? "Marked as lost" : "Book returned")
    }
  }

  async function handleBorrow(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsSubmitting(true)
    const formData = new FormData(e.currentTarget)
    const bookId = formData.get("bookId") as string
    const userId = formData.get("userId") as string
    const dueDate = new Date(formData.get("dueDate") as string)
    
    const res = await borrowBook(bookId, userId, schoolId, dueDate)
    if ((res as any)?.error) {
      toast.error((res as any).error)
    } else {
      toast.success("Book issued successfully")
      ;(e.target as HTMLFormElement).reset()
    }
    setIsSubmitting(false)
  }

  return (
    <div className="space-y-6">
      {/* Header & Alert Action Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Library & Circulation Desk</h1>
          <p className="text-xs text-slate-500">Manage book inventory, circulation desk issues/returns, and dispatch automated due & fine alerts.</p>
        </div>
        <LibrarianAlertModal schoolId={schoolId} borrowRecords={borrowRecords} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Titles</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTitles}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Currently Borrowed</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentlyBorrowed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Books</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{overdueBooks}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Fines Collected</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalFines.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="catalog">Catalog Management</TabsTrigger>
          <TabsTrigger value="circulation">Circulation Desk</TabsTrigger>
          <TabsTrigger value="add">Add New Book</TabsTrigger>
        </TabsList>

        <TabsContent value="catalog" className="mt-4">
          <Card>
            <CardHeader><CardTitle>Library Catalog</CardTitle></CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted text-muted-foreground">
                    <tr>
                      <th className="p-3">Title</th>
                      <th className="p-3">Author</th>
                      <th className="p-3">ISBN</th>
                      <th className="p-3">Available</th>
                    </tr>
                  </thead>
                  <tbody>
                    {books.map((b: any) => (
                      <tr key={b.id} className="border-t">
                        <td className="p-3 font-medium">{b.title}</td>
                        <td className="p-3">{b.author}</td>
                        <td className="p-3">{b.isbn || "N/A"}</td>
                        <td className="p-3">{b.availableCopies} / {b.totalCopies}</td>
                      </tr>
                    ))}
                    {books.length === 0 && (
                      <tr>
                        <td colSpan={4} className="p-3 text-center text-muted-foreground">No books found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="circulation" className="mt-4">
          <Card>
            <CardHeader><CardTitle>Active Borrows (Circulation)</CardTitle></CardHeader>
            <CardContent>
               <form onSubmit={handleBorrow} className="mb-6 p-4 border rounded-md grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div className="space-y-1">
                  <Label>Book</Label>
                  <select name="bookId" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" required>
                    <option value="">Select Book...</option>
                    {books.filter((b: any) => b.availableCopies > 0).map((b: any) => (
                      <option key={b.id} value={b.id}>{b.title}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label>User ID (Student/Teacher)</Label>
                  <Input name="userId" placeholder="Enter User ID" required />
                </div>
                <div className="space-y-1">
                  <Label>Due Date</Label>
                  <Input type="date" name="dueDate" required />
                </div>
                <Button type="submit" disabled={isSubmitting}>Issue Book</Button>
              </form>
              
              <div className="rounded-md border">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted text-muted-foreground">
                    <tr>
                      <th className="p-3">Book</th>
                      <th className="p-3">User</th>
                      <th className="p-3">Due Date</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {borrowRecords.filter((r: any) => r.status === "BORROWED").map((r: any) => (
                      <tr key={r.id} className="border-t">
                        <td className="p-3 font-medium">{r.book.title}</td>
                        <td className="p-3">
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-800">{r.user?.name || "User"}</span>
                            <span className="text-xs text-slate-500 font-mono">
                              {r.user?.email} • <span className="bg-slate-100 text-blue-700 px-1.5 py-0.5 rounded font-bold">ID: {r.user?.id?.slice(0, 8).toUpperCase()} ({r.user?.role})</span>
                            </span>
                          </div>
                        </td>
                        <td className="p-3">{new Date(r.dueDate).toLocaleDateString()}</td>
                        <td className="p-3">
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">{r.status}</span>
                        </td>
                        <td className="p-3 space-x-2">
                          <Button size="sm" variant="outline" onClick={() => handleReturn(r.id, false)}>Return</Button>
                          <Button size="sm" variant="destructive" onClick={() => handleReturn(r.id, true)}>Lost</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="add" className="mt-4">
          <Card>
            <CardHeader><CardTitle>Add New Book</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={handleAddBook} className="space-y-4 max-w-md">
                <div className="space-y-2">
                  <Label>Title *</Label>
                  <Input name="title" required />
                </div>
                <div className="space-y-2">
                  <Label>Author *</Label>
                  <Input name="author" required />
                </div>
                <div className="space-y-2">
                  <Label>ISBN</Label>
                  <Input name="isbn" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Publisher</Label>
                    <Input name="publisher" />
                  </div>
                  <div className="space-y-2">
                    <Label>Rack Number</Label>
                    <Input name="rackNumber" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Total Copies *</Label>
                  <Input type="number" name="totalCopies" defaultValue="1" min="1" required />
                </div>
                <Button type="submit" disabled={isSubmitting}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Book
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
