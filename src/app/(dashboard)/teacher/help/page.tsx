import { Role } from "@prisma/client"
import { getSupportTickets } from "@/app/actions/support.actions"
import { FaqAccordion, FaqItem } from "@/components/help/FaqAccordion"
import { SupportTicketForm } from "@/components/help/SupportTicketForm"
import { SupportTicketList } from "@/components/help/SupportTicketList"
import { ContactCards } from "@/components/help/ContactCards"
import { BookOpen, Send, MessageSquare, HelpCircle, CheckCircle2, UserCheck } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const TEACHER_FAQS: FaqItem[] = [
  {
    id: "tch-1",
    category: "Marks & Grading",
    question: "How do I enter and finalize marks for my subjects?",
    answer: "Navigate to Enter Marks in the sidebar. Select your assigned class, subject, and exam session. Enter marks for each student and save as Draft or click Publish to make results accessible.",
    tags: ["marks", "grading", "results"],
  },
  {
    id: "tch-2",
    category: "Class Teacher Duties",
    question: "What special actions can I perform if I am assigned as Class Teacher?",
    answer: "As Class Teacher, you gain access to 'My Class' tab. You can verify section daily attendance, approve student profile update requests, view early risk alerts, and handle class parent inquiries.",
    tags: ["class-teacher", "attendance", "my-class"],
  },
  {
    id: "tch-3",
    category: "At-Risk Early Alert",
    question: "How does the At-Risk Early Alert system work?",
    answer: "When a student falls below attendance thresholds or displays failing marks trends, an automated risk flag is generated. Class teachers can review the flag, log an intervention action, or notify parents.",
    tags: ["at-risk", "alerts", "interventions"],
  },
  {
    id: "tch-4",
    category: "Learning Hub",
    question: "How do I share chapter notes, PDFs, and video lessons with students?",
    answer: "Go to Notes & Hub in the sidebar. Create a chapter under your subject, add topics, and attach PDF documents or video URLs. Students enrolled in that subject will immediately see these resources in their Learning Hub.",
    tags: ["learning-hub", "notes", "resources"],
  },
  {
    id: "tch-5",
    category: "Leaves & Substitutes",
    question: "How do I submit a leave request and view substitute assignments?",
    answer: "Submit leave applications under Leave Requests. When approved by Admin, the system can automatically assign substitute teachers for your scheduled timetable periods.",
    tags: ["leave", "substitutes", "timetable"],
  },
]

export default async function TeacherHelpPage() {
  const incomingQueries = await getSupportTickets({ scope: "incoming" })
  const mySubmittedTickets = await getSupportTickets({ scope: "mine" })

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-wider mb-1">
            <BookOpen className="h-4 w-4" />
            Teacher Helpdesk & Academic Support
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Teacher Help & Support Desk
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Submit classroom or administrative requests to School Admin, answer student/parent queries, and access teaching guides.
          </p>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="submit" className="w-full space-y-6">
        <TabsList className="bg-slate-100 p-1 rounded-xl">
          <TabsTrigger value="submit" className="text-xs font-semibold px-4 py-2">
            Submit Ticket to Admin
          </TabsTrigger>
          <TabsTrigger value="queries" className="text-xs font-semibold px-4 py-2">
            Student & Parent Queries ({incomingQueries.length})
          </TabsTrigger>
          <TabsTrigger value="mytickets" className="text-xs font-semibold px-4 py-2">
            My Submitted Tickets ({mySubmittedTickets.length})
          </TabsTrigger>
          <TabsTrigger value="faqs" className="text-xs font-semibold px-4 py-2">
            Teacher FAQs & User Manual
          </TabsTrigger>
          <TabsTrigger value="contacts" className="text-xs font-semibold px-4 py-2">
            School Directory
          </TabsTrigger>
        </TabsList>

        <TabsContent value="submit" className="space-y-4">
          <SupportTicketForm
            userRole={Role.TEACHER}
            availableTargetRoles={[Role.ADMIN]}
            categories={[
              "Classroom Hardware / Asset Issue",
              "Mark Entry Lock / Grading System",
              "Attendance Correction Request",
              "Salary & Payroll Query",
              "Leave Application Support",
              "General Administrative Inquiry",
            ]}
          />
        </TabsContent>

        <TabsContent value="queries" className="space-y-4">
          <SupportTicketList
            tickets={incomingQueries as any}
            scope="incoming"
            canReply={true}
            title="Incoming Academic Queries from Students & Parents"
          />
        </TabsContent>

        <TabsContent value="mytickets" className="space-y-4">
          <SupportTicketList
            tickets={mySubmittedTickets as any}
            scope="mine"
            canReply={false}
            title="My Administrative Tickets Sent to School Admin"
          />
        </TabsContent>

        <TabsContent value="faqs" className="space-y-4">
          <FaqAccordion
            faqs={TEACHER_FAQS}
            title="Teacher Teaching & Grading Guide"
            subtitle="Step-by-step instructions for marks entry, class management, early alerts, and notes sharing."
          />
        </TabsContent>

        <TabsContent value="contacts" className="space-y-4">
          <ContactCards
            contacts={[
              {
                title: "Academic Principal Office",
                role: "School Admin",
                email: "principal@school.edu",
                phone: "+1 (800) 555-0150",
                hours: "Mon - Fri: 8:00 AM - 4:00 PM EST",
                description: "Contact for curriculum policy, class roster approvals, and formal leave requests.",
                badgeText: "Admin",
              },
              {
                title: "School IT Support Desk",
                role: "Technical Team",
                email: "itsupport@school.edu",
                phone: "+1 (800) 555-0155",
                hours: "Mon - Fri: 7:30 AM - 4:30 PM EST",
                description: "Contact for portal login errors, projector issues, or computer lab access.",
                badgeText: "IT Support",
              },
            ]}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
