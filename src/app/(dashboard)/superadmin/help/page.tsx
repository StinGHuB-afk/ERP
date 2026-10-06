import { Role, TicketStatus } from "@prisma/client"
import { getSupportTickets, getSupportOverviewStats } from "@/app/actions/support.actions"
import { FaqAccordion, FaqItem } from "@/components/help/FaqAccordion"
import { SupportTicketList } from "@/components/help/SupportTicketList"
import { ContactCards } from "@/components/help/ContactCards"
import { Shield, Building2, Server, Lock, HelpCircle } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const SUPERADMIN_FAQS: FaqItem[] = [
  {
    id: "sa-1",
    category: "Multi-Tenant & Security",
    question: "How is tenant data isolation enforced between different schools?",
    answer: "Every database query uses strict `schoolId` filters based on session context (`getEffectiveTenantId`). Cross-school queries are blocked at both server action level and database relation boundaries. Superadmins can impersonate school contexts safely without leaking cross-tenant data.",
    tags: ["tenant-isolation", "security", "multi-tenant"],
  },
  {
    id: "sa-2",
    category: "Module Management",
    question: "How do I enable or disable optional modules (Library, Transport, Payroll) for a school?",
    answer: "Navigate to SuperAdmin Hub -> Schools -> Manage Modules. Toggle individual module switches (LIBRARY, TRANSPORT, PAYROLL, FINANCE, ASSETS). When disabled, sidebar items lock automatically for all users of that school.",
    tags: ["modules", "entitlements", "features"],
  },
  {
    id: "sa-3",
    category: "Security & Lockouts",
    question: "How do I manage rate limiting and locked user accounts?",
    answer: "Failed login attempts trigger progressive delays (3s at 3 failures, 10s at 5 failures, account lockout at 10 failures). Locked accounts auto-expire after 30 minutes, or Superadmin can clear `lockedUntil` via the User Management table.",
    tags: ["rate-limiting", "auth", "lockout"],
  },
  {
    id: "sa-4",
    category: "System Auditing",
    question: "Where can I review activity logs and system audit trails?",
    answer: "All critical actions (role changes, ticket responses, marks updates, class teacher assignments) write entries to the `ActivityLog` model. Access these in Admin/Superadmin Activity Log section.",
    tags: ["audit", "logs", "activity"],
  },
  {
    id: "sa-5",
    category: "Academic Rollover",
    question: "What is the procedure for year-end Academic Session rollover?",
    answer: "Use Promotions & Rollover under Admin Academics. Ensure current session marks are finalized, run bulk promotion to transition students, and archive the completed Academic Session.",
    tags: ["academic-session", "promotions", "rollover"],
  },
]

export default async function SuperadminHelpPage() {
  const stats = await getSupportOverviewStats()
  const incomingEscalations = await getSupportTickets({ scope: "incoming" })

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-wider mb-1">
            <Shield className="h-4 w-4" />
            Global Platform Command
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Superadmin Help & Platform Support Hub
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Central management for school admin ticket escalations, multi-tenant security guides, and SaaS platform documentation.
          </p>
        </div>
      </div>

      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Platform Escalations</span>
            <Building2 className="h-4 w-4 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{stats.total}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Tickets sent by School Admins</p>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-800">Pending Review</span>
            <HelpCircle className="h-4 w-4 text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-amber-950 mt-2">{stats.open}</p>
          <p className="text-[11px] text-amber-700 mt-0.5">Open tickets requiring response</p>
        </div>

        <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-blue-800">In Progress</span>
            <Server className="h-4 w-4 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-blue-950 mt-2">{stats.inProgress}</p>
          <p className="text-[11px] text-blue-700 mt-0.5">Under technical investigation</p>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-800">Resolved Escalations</span>
            <Lock className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-emerald-950 mt-2">{stats.resolved}</p>
          <p className="text-[11px] text-emerald-700 mt-0.5">Successfully closed cases</p>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="incoming" className="w-full space-y-6">
        <TabsList className="bg-slate-100 p-1 rounded-xl">
          <TabsTrigger value="incoming" className="text-xs font-semibold px-4 py-2">
            School Admin Ticket Desk ({incomingEscalations.length})
          </TabsTrigger>
          <TabsTrigger value="faqs" className="text-xs font-semibold px-4 py-2">
            Platform Knowledge Base & FAQs
          </TabsTrigger>
          <TabsTrigger value="contacts" className="text-xs font-semibold px-4 py-2">
            Engineering Contacts & SLA
          </TabsTrigger>
        </TabsList>

        <TabsContent value="incoming" className="space-y-4">
          <SupportTicketList
            tickets={incomingEscalations as any}
            scope="incoming"
            canReply={true}
            title="School Admin Ticket Escalations Desk"
          />
        </TabsContent>

        <TabsContent value="faqs" className="space-y-4">
          <FaqAccordion
            faqs={SUPERADMIN_FAQS}
            title="Superadmin SaaS Operational Knowledge Base"
            subtitle="Architectural guides, multi-tenant security protocols, and platform administration FAQs."
          />
        </TabsContent>

        <TabsContent value="contacts" className="space-y-4">
          <ContactCards
            contacts={[
              {
                title: "Core Infrastructure Support",
                role: "DevOps & Cloud Engineering",
                email: "devops@edumanage.com",
                phone: "+1 (800) 555-0199",
                hours: "24/7 Hotline for Outages",
                description: "Primary point of contact for server downtime, database scaling, or network emergencies.",
                badgeText: "24/7 Priority",
              },
              {
                title: "Security & Compliance Desk",
                role: "Platform Security Officer",
                email: "security@edumanage.com",
                phone: "+1 (800) 555-0188",
                hours: "Mon - Fri: 8:00 AM - 6:00 PM EST",
                description: "Escalation contact for security audits, data privacy inquiries, or tenant isolation reports.",
                badgeText: "Security",
              },
            ]}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
