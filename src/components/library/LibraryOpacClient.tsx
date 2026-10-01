"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { BookOpen, Search } from "lucide-react"

export function LibraryOpacClient({ books, myBorrowRecords }: any) {
  const [search, setSearch] = useState("")

  const filteredBooks = books.filter((b: any) => 
    b.title.toLowerCase().includes(search.toLowerCase()) || 
    b.author.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" /> Library Catalog (OPAC)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative mb-6">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search by title or author..." 
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredBooks.map((b: any) => (
              <div key={b.id} className="border rounded-lg p-4 flex flex-col justify-between">
                <div>
                  <h3 className="font-semibold text-lg line-clamp-1" title={b.title}>{b.title}</h3>
                  <p className="text-muted-foreground text-sm mb-2">{b.author}</p>
                  <p className="text-xs text-slate-500">ISBN: {b.isbn || "N/A"} | Rack: {b.rackNumber || "N/A"}</p>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <span className={`text-xs font-medium px-2 py-1 rounded ${b.availableCopies > 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                    {b.availableCopies > 0 ? `${b.availableCopies} Available` : "Out of Stock"}
                  </span>
                </div>
              </div>
            ))}
            {filteredBooks.length === 0 && (
              <p className="text-muted-foreground">No books found matching your search.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>My Borrowing History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted text-muted-foreground">
                <tr>
                  <th className="p-3">Title</th>
                  <th className="p-3">Borrowed On</th>
                  <th className="p-3">Due Date</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {myBorrowRecords.map((r: any) => (
                  <tr key={r.id} className="border-t">
                    <td className="p-3 font-medium">{r.book.title}</td>
                    <td className="p-3">{new Date(r.borrowedAt).toLocaleDateString()}</td>
                    <td className="p-3">{new Date(r.dueDate).toLocaleDateString()}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded text-xs ${
                        r.status === "BORROWED" ? "bg-yellow-100 text-yellow-800" : 
                        r.status === "RETURNED" ? "bg-green-100 text-green-800" : 
                        "bg-red-100 text-red-800"
                      }`}>
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {myBorrowRecords.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-3 text-center text-muted-foreground">No borrowing history.</td>
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
