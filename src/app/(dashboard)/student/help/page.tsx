import { Role } from "@prisma/client"
import { getSupportTickets, getTeachersForSupport } from "@/app/actions/support.actions"
import { FaqAccordion, FaqItem } from "@/components/help/FaqAccordion"
import { SupportTicketForm } from "@/components/help/SupportTicketForm"
import { SupportTicketList } from "@/components/help/SupportTicketList"
import { ContactCards } from "@/components/help/ContactCards"
import { GraduationCap, Send, MessageSquare, BookOpen, HelpCircle } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const STUDENT_FAQS: FaqItem[] = [
  {
    id: "std-1",
    category: "Marks & Results",
    question: "Where can I view my exam marks and report cards?",
    answer: "Go to My Results in the sidebar. You can view subject-wise scores, percentage, letter grades, and export your digital report card as a PDF.",
    tags: ["marks", "results", "report-card"],
  },
  {
    id: "std-2",
    category: "Learning Hub",
    question: "How do I access study notes, PDFs, and video lessons?",
    answer: "Click on Learning Hub in the sidebar. Select your subject to view chapters, read topic summaries, download PDF notes, and watch video lectures uploaded by your teachers.",
    tags: ["learning-hub", "notes", "videos"],
  },
  {
    id: "std-3",
    category: "Attendance & Leaves",
    question: "How do I check my attendance record and apply for leave?",
    answer: "Check your main Student Dashboard for attendance percentage. To request leave, go to Leave Requests, select dates and reason, and submit for teacher/admin approval.",
    tags: ["attendance", "leave", "dashboard"],
  },
  {
    id: "std-4",
    category: "Library Books",
    question: "How do I search for books and check my borrowed items?",
    answer: "Open Library Catalog in the sidebar. You can search by book title or author, view available copies, and check your active borrowed books and return due dates.",
    tags: ["library", "books", "borrow"],
  },
  {
    id: "std-5",
    category: "Academic Doubts",
    question: "How can I ask my subject teacher an academic question?",
    answer: "Use the 'Ask Teacher / Submit Ticket' tab on this page! Select your teacher or route your question to the Admin desk if it's a technical login problem.",
    tags: ["teacher", "doubts", "support"],
  },
]

export default async function StudentHelpPage() {
  const mySubmittedTickets = await getSupportTickets({ scope: "mine" })
  const teachersList = await getTeachersForSupport()

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-wider mb-1">
            <GraduationCap className="h-4 w-4" />
            Student Helpline & Academic Support
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Student Help & Support Center
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Ask academic doubts to your Class & Subject Teachers, report portal issues, or read learning guides.
          </p>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="ask" className="w-full space-y-6">
        <TabsList className="bg-slate-100 p-1 rounded-xl">
          <TabsTrigger value="ask" className="text-xs font-semibold px-4 py-2">
            Ask Teacher / Submit Ticket
          </TabsTrigger>
          <TabsTrigger value="mytickets" className="text-xs font-semibold px-4 py-2">
            My Submitted Tickets ({mySubmittedTickets.length})
          </TabsTrigger>
          <TabsTrigger value="faqs" className="text-xs font-semibold px-4 py-2">
            Student Guides & FAQs
          </TabsTrigger>
          <TabsTrigger value="contacts" className="text-xs font-semibold px-4 py-2">
            School Contacts
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ask" className="space-y-4">
          <SupportTicketForm
            userRole={Role.STUDENT}
            availableTargetRoles={[Role.TEACHER, Role.ADMIN]}
            teachersList={teachersList}
            categories={[
              "Academic Subject Doubt",
              "Marks / Result Clarification",
              "Learning Hub Notes / PDF Issue",
              "Portal Login / Password Issue",
              "Library Book Borrow Inquiry",
              "General Student Question",
            ]}
          />
        </TabsContent>

        <TabsContent value="mytickets" className="space-y-4">
          <SupportTicketList
            tickets={mySubmittedTickets as any}
            scope="mine"
            canReply={false}
            title="My Academic Doubts & Support Tickets"
          />
        </TabsContent>

        <TabsContent value="faqs" className="space-y-4">
          <FaqAccordion
            faqs={STUDENT_FAQS}
            title="Student Portal Walkthrough & FAQs"
            subtitle="Guides for accessing results, Learning Hub study material, attendance tracking, and library books."
          />
        </TabsContent>

        <TabsContent value="contacts" className="space-y-4">
          <ContactCards
            contacts={[
              {
                title: "Student Academic Helpline",
                role: "Class Teacher Desk",
                email: "academic-help@school.edu",
                phone: "+1 (800) 555-0177",
                hours: "Mon - Fri: 8:00 AM - 3:30 PM EST",
                description: "Direct contact line for class teachers, homework help, and academic guidance.",
                badgeText: "Academic Desk",
              },
              {
                title: "Student IT & Portal Support",
                role: "Helpdesk",
                email: "student-it@school.edu",
                phone: "+1 (800) 555-0178",
                hours: "Mon - Fri: 8:00 AM - 4:00 PM EST",
                description: "Contact for password resets, email login issues, or app technical support.",
                badgeText: "Portal IT",
              },
            ]}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
