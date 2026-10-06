import { Role } from "@prisma/client"
import { getSupportTickets, getTeachersForSupport } from "@/app/actions/support.actions"
import { FaqAccordion, FaqItem } from "@/components/help/FaqAccordion"
import { SupportTicketForm } from "@/components/help/SupportTicketForm"
import { SupportTicketList } from "@/components/help/SupportTicketList"
import { ContactCards } from "@/components/help/ContactCards"
import { Users, Send, MessageSquare, BookOpen, HeartHandshake } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const PARENT_FAQS: FaqItem[] = [
  {
    id: "prn-1",
    category: "Academic Progress",
    question: "How can I monitor my child's academic marks and progress?",
    answer: "Log into the Parent Portal dashboard to view your child's recent exam scores, subject grades, and overall progress report. You can also view Class Teacher notes.",
    tags: ["marks", "parent-portal", "child-progress"],
  },
  {
    id: "prn-2",
    category: "Attendance & Absence",
    question: "How am I notified if my child is absent or late?",
    answer: "Daily attendance is recorded by teachers every morning. If your child is marked absent or late, an immediate notification alert is sent to your Parent Alerts inbox.",
    tags: ["attendance", "alerts", "notifications"],
  },
  {
    id: "prn-3",
    category: "Fee Payments & Receipts",
    question: "How do I check fee dues and payment history?",
    answer: "Under Finance & Fees (or Parent Dashboard fee section), view breakdown of tuition, activity fees, outstanding balances, and official payment receipts.",
    tags: ["fees", "payments", "finance"],
  },
  {
    id: "prn-4",
    category: "Teacher Communication",
    question: "How do I contact my child's Class Teacher or Principal?",
    answer: "Use the 'Submit Inquiry / Contact Desk' tab on this page. Select 'Teacher' to send a message directly to your child's Class Teacher, or select 'School Admin' for office queries.",
    tags: ["teacher-meeting", "inquiry", "communication"],
  },
  {
    id: "prn-5",
    category: "Library & Transport",
    question: "How do I check my child's borrowed library books or bus route?",
    answer: "Check the Library Catalog tab in your Parent sidebar to view currently borrowed books and due dates. Transport route updates appear in your alerts.",
    tags: ["library", "transport", "books"],
  },
]

export default async function ParentHelpPage() {
  const mySubmittedTickets = await getSupportTickets({ scope: "mine" })
  const teachersList = await getTeachersForSupport()

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-wider mb-1">
            <HeartHandshake className="h-4 w-4" />
            Parent Portal Help & Communication Center
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Parent Support & Inquiry Desk
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Direct channel to communicate with Class Teachers and School Administration regarding your child's academics and school services.
          </p>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="submit" className="w-full space-y-6">
        <TabsList className="bg-slate-100 p-1 rounded-xl">
          <TabsTrigger value="submit" className="text-xs font-semibold px-4 py-2">
            Submit Inquiry / Contact Desk
          </TabsTrigger>
          <TabsTrigger value="mytickets" className="text-xs font-semibold px-4 py-2">
            My Inquiries & Responses ({mySubmittedTickets.length})
          </TabsTrigger>
          <TabsTrigger value="faqs" className="text-xs font-semibold px-4 py-2">
            Parent Guides & FAQs
          </TabsTrigger>
          <TabsTrigger value="contacts" className="text-xs font-semibold px-4 py-2">
            School Office Directory
          </TabsTrigger>
        </TabsList>

        <TabsContent value="submit" className="space-y-4">
          <SupportTicketForm
            userRole={Role.PARENT}
            availableTargetRoles={[Role.TEACHER, Role.ADMIN]}
            teachersList={teachersList}
            categories={[
              "Academic & Behavior Inquiry",
              "Attendance / Absence Explanation",
              "Fee Payment & Receipt Inquiry",
              "Transport / Route Change Request",
              "Parent Portal Access / Technical",
              "General Administration Question",
            ]}
          />
        </TabsContent>

        <TabsContent value="mytickets" className="space-y-4">
          <SupportTicketList
            tickets={mySubmittedTickets as any}
            scope="mine"
            canReply={false}
            title="My Submitted Inquiries & Responses"
          />
        </TabsContent>

        <TabsContent value="faqs" className="space-y-4">
          <FaqAccordion
            faqs={PARENT_FAQS}
            title="Parent Portal User Guide & FAQs"
            subtitle="Walkthroughs for tracking child performance, attendance notifications, fee payments, and teacher meetings."
          />
        </TabsContent>

        <TabsContent value="contacts" className="space-y-4">
          <ContactCards
            contacts={[
              {
                title: "Parent Liaison & Admin Office",
                role: "Front Desk Administrator",
                email: "parents@school.edu",
                phone: "+1 (800) 555-0144",
                hours: "Mon - Fri: 8:00 AM - 4:00 PM EST",
                description: "Primary front desk for parent inquiries, fee payments, and appointment scheduling.",
                badgeText: "Main Office",
              },
              {
                title: "Academic Principal Office",
                role: "Vice Principal",
                email: "principal-office@school.edu",
                phone: "+1 (800) 555-0145",
                hours: "Mon - Fri: 9:00 AM - 3:00 PM EST",
                description: "Special appointments for academic counseling, transfers, or student welfare.",
                badgeText: "Principal Desk",
              },
            ]}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
