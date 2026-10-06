import { Role, TicketStatus } from "@prisma/client"
import { getSupportTickets, getSupportOverviewStats } from "@/app/actions/support.actions"
import { FaqAccordion, FaqItem } from "@/components/help/FaqAccordion"
import { SupportTicketForm } from "@/components/help/SupportTicketForm"
import { SupportTicketList } from "@/components/help/SupportTicketList"
import { ContactCards } from "@/components/help/ContactCards"
import { Building2, MessageSquare, Send, HelpCircle, Users, BookOpen } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const ADMIN_FAQS: FaqItem[] = [
  {
    id: "adm-1",
    category: "Class & Teacher Assignment",
    question: "How do I assign a Class Teacher to a class?",
    answer: "Go to Admin -> Classes, click 'Assign Class Teacher' or edit a class. Select the teacher. If the teacher is already assigned as Class Teacher for another class, a conflict warning pop-up will appear allowing you to confirm re-assignment or cancel.",
    tags: ["class-teacher", "classes", "assignment"],
  },
  {
    id: "adm-2",
    category: "Teacher Roles",
    question: "What is the difference between a Class Teacher and a Subject Teacher?",
    answer: "A Class Teacher is responsible for the overall homeroom management, daily attendance verification, and class roster of a specific section. Subject Teachers teach specific subjects (e.g. Mathematics) to multiple classes without homeroom duties.",
    tags: ["roles", "class-teacher", "subject-teacher"],
  },
  {
    id: "adm-3",
    category: "Admissions & Students",
    question: "How do online admissions transition to active student records?",
    answer: "In Admin -> Online Admissions, review incoming applications. Approving an application automatically provisions a Student record linked to the appropriate class and generates parent credentials if requested.",
    tags: ["admissions", "students", "enrollment"],
  },
  {
    id: "adm-4",
    category: "Finance & Payroll",
    question: "How do I setup fee structures and execute monthly payroll runs?",
    answer: "Finance & Fees allows creating grade-wise fee structures and recording payments. Payroll allows generating monthly payslips for all active teachers based on base salary, allowances, and deductions.",
    tags: ["finance", "fees", "payroll"],
  },
  {
    id: "adm-5",
    category: "Transport & Library Modules",
    question: "Why are some module links disabled in the sidebar?",
    answer: "Modules like Transport or Library can be enabled or disabled for your school by the Platform Superadmin. If your school requires access to a locked module, submit an escalation ticket to Superadmin in the 'Escalate to Superadmin' tab.",
    tags: ["modules", "library", "transport"],
  },
]

export default async function AdminHelpPage() {
  const stats = await getSupportOverviewStats()
  const incomingTickets = await getSupportTickets({ scope: "incoming" })
  const mySubmittedTickets = await getSupportTickets({ scope: "mine" })

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-wider mb-1">
            <Building2 className="h-4 w-4" />
            School Administration Command
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            School Help & Support Desk Center
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage incoming support requests from teachers, students, parents, and librarians, or escalate platform issues to Superadmin.
          </p>
        </div>
      </div>

      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">School Inquiries</span>
            <Users className="h-4 w-4 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{incomingTickets.length}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Total tickets from school members</p>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-800">Pending Response</span>
            <MessageSquare className="h-4 w-4 text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-amber-950 mt-2">
            {incomingTickets.filter((t) => t.status === TicketStatus.OPEN).length}
          </p>
          <p className="text-[11px] text-amber-700 mt-0.5">Open tickets awaiting action</p>
        </div>

        <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-blue-800">My Platform Escalations</span>
            <Send className="h-4 w-4 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-blue-950 mt-2">{mySubmittedTickets.length}</p>
          <p className="text-[11px] text-blue-700 mt-0.5">Tickets sent to Superadmin</p>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-800">Resolved Inquiries</span>
            <HelpCircle className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-emerald-950 mt-2">
            {incomingTickets.filter((t) => t.status === TicketStatus.RESOLVED).length}
          </p>
          <p className="text-[11px] text-emerald-700 mt-0.5">Resolved staff/student inquiries</p>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="incoming" className="w-full space-y-6">
        <TabsList className="bg-slate-100 p-1 rounded-xl">
          <TabsTrigger value="incoming" className="text-xs font-semibold px-4 py-2">
            School Inquiries Helpdesk ({incomingTickets.length})
          </TabsTrigger>
          <TabsTrigger value="escalate" className="text-xs font-semibold px-4 py-2">
            Escalate to Superadmin
          </TabsTrigger>
          <TabsTrigger value="mytickets" className="text-xs font-semibold px-4 py-2">
            My Submitted Tickets ({mySubmittedTickets.length})
          </TabsTrigger>
          <TabsTrigger value="faqs" className="text-xs font-semibold px-4 py-2">
            Admin Guides & FAQs
          </TabsTrigger>
          <TabsTrigger value="contacts" className="text-xs font-semibold px-4 py-2">
            Support Contacts
          </TabsTrigger>
        </TabsList>

        <TabsContent value="incoming" className="space-y-4">
          <SupportTicketList
            tickets={incomingTickets as any}
            scope="incoming"
            canReply={true}
            title="School Members Support Desk (Teachers, Students, Parents, Librarians)"
          />
        </TabsContent>

        <TabsContent value="escalate" className="space-y-4">
          <SupportTicketForm
            userRole={Role.ADMIN}
            availableTargetRoles={[Role.SUPERADMIN]}
            categories={[
              "Platform Technical Bug",
              "Module Enablement Request",
              "Custom Domain & Branding",
              "Database / Data Migration",
              "Subscription & Billing",
              "General Superadmin Inquiry",
            ]}
          />
        </TabsContent>

        <TabsContent value="mytickets" className="space-y-4">
          <SupportTicketList
            tickets={mySubmittedTickets as any}
            scope="mine"
            canReply={false}
            title="Platform Support Tickets Sent to Superadmin"
          />
        </TabsContent>

        <TabsContent value="faqs" className="space-y-4">
          <FaqAccordion
            faqs={ADMIN_FAQS}
            title="School Administration Operating Guide"
            subtitle="Walkthroughs for class management, admissions, fee administration, and portal configuration."
          />
        </TabsContent>

        <TabsContent value="contacts" className="space-y-4">
          <ContactCards
            contacts={[
              {
                title: "Platform Superadmin Support",
                role: "Technical Desk",
                email: "superadmin@edumanage.com",
                phone: "+1 (800) 555-0100",
                hours: "Mon - Sat: 8:00 AM - 8:00 PM EST",
                description: "Contact for system errors, tenant configuration, or emergency database sync.",
                badgeText: "SaaS Provider",
              },
              {
                title: "School IT & Infrastructure",
                role: "System Administrator",
                email: "admin-it@school.edu",
                phone: "+1 (800) 555-0122",
                hours: "Mon - Fri: 8:00 AM - 5:00 PM EST",
                description: "Local IT office for hardware, network, and device provisioning.",
                badgeText: "On-site IT",
              },
            ]}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
