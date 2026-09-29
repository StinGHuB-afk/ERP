import { createBroadcastAlert } from "@/app/actions/notification.actions"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Send } from "lucide-react"

export default function CreateAlertPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-8 pt-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Broadcast Alert</h1>
        <p className="text-sm text-slate-500">Send a system notification to users in your school.</p>
      </div>

      <Card className="shadow-sm border-slate-200">
        <CardHeader className="bg-slate-50 border-b border-slate-100">
          <CardTitle className="text-lg font-semibold text-slate-800">Alert Details</CardTitle>
          <CardDescription>Fill out the information below to broadcast an alert.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form action={createBroadcastAlert} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Alert Title</Label>
              <Input id="title" name="title" placeholder="e.g. Campus Closure Tomorrow" required />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea 
                id="message" 
                name="message" 
                placeholder="Type your notification message here..." 
                className="min-h-[100px]" 
                required 
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <select 
                  id="priority" 
                  name="priority"
                  className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  required
                >
                  <option value="INFO">Information</option>
                  <option value="WARNING">Warning</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="targetRole">Target Audience</Label>
                <select 
                  id="targetRole" 
                  name="targetRole"
                  className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  required
                >
                  <option value="ALL">All Users</option>
                  <option value="TEACHER">Teachers Only</option>
                  <option value="STUDENT">Students Only</option>
                  <option value="PARENT">Parents Only</option>
                </select>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <Button type="submit" className="gap-2">
                <Send className="w-4 h-4" />
                Broadcast Alert
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
