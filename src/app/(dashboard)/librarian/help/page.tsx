import { Role } from "@prisma/client"
import { getSupportTickets } from "@/app/actions/support.actions"
import { FaqAccordion, FaqItem } from "@/components/help/FaqAccordion"
import { SupportTicketForm } from "@/components/help/SupportTicketForm"
import { SupportTicketList } from "@/components/help/SupportTicketList"
import { ContactCards } from "@/components/help/ContactCards"
import { BookOpen, Send, ShieldCheck, HelpCircle } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const LIBRARIAN_FAQS: FaqItem[] = [
  {
    id: "lib-1",
    category: "Cataloging & Inventory",
    question: "How do I add new books and manage stock quantities?",
    answer: "Go to Library Catalog in the librarian sidebar. Click 'Add Book', enter ISBN, Title, Author, Category, total copies, and shelf position. Saving updates total available inventory for your school.",
    tags: ["catalog", "inventory", "books"],
  },
  {
    id: "lib-2",
    category: "Circulation & Issue",
    question: "How do I issue a book to a student or teacher?",
    answer: "In the Library dashboard, select 'Issue Book'. Search for the student or teacher by name/ID, pick the book, and specify the return due date. The system logs a `BorrowRecord` linked to your school.",
    tags: ["circulation", "issue", "borrow"],
  },
  {
    id: "lib-3",
    category: "Tenant Data Isolation",
    question: "Why can I only view and issue books to students from my own school?",
    answer: "Multi-tenant data isolation ensures that library catalog items, borrow records, and student lists are strictly isolated per school (`schoolId`). Librarians cannot view or issue books to users from other schools.",
    tags: ["tenant-isolation", "security", "multi-tenant"],
  },
  {
    id: "lib-4",
    category: "Fines & Overdue Books",
    question: "How are overdue fines calculated and collected?",
    answer: "When returning an overdue book, the system calculates fines based on days past the due date. The fine amount is logged into the ledger and can be collected or waived with Admin approval.",
    tags: ["fines", "overdue", "returns"],
  },
  {
    id: "lib-5",
    category: "Unlisted Student / Staff Records",
    question: "What should I do if a student or teacher does not appear in the issue dropdown?",
    answer: "Verify that the student or teacher is actively enrolled in your school context. If newly admitted, request School Admin to verify active enrollment status, or submit a support ticket via this page.",
    tags: ["enrollment", "missing-user", "support"],
  },
]

export default async function LibrarianHelpPage() {
  const mySubmittedTickets = await getSupportTickets({ scope: "mine" })

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-wider mb-1">
            <BookOpen className="h-4 w-4" />
            Librarian Support & Operations Center
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Librarian Help & Support Desk
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Submit library administrative requests to School Admin, view cataloging rules, and track support ticket progress.
          </p>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="submit" className="w-full space-y-6">
        <TabsList className="bg-slate-100 p-1 rounded-xl">
          <TabsTrigger value="submit" className="text-xs font-semibold px-4 py-2">
            Submit Request to Admin
          </TabsTrigger>
          <TabsTrigger value="mytickets" className="text-xs font-semibold px-4 py-2">
            My Submitted Tickets ({mySubmittedTickets.length})
          </TabsTrigger>
          <TabsTrigger value="faqs" className="text-xs font-semibold px-4 py-2">
            Librarian Manual & FAQs
          </TabsTrigger>
          <TabsTrigger value="contacts" className="text-xs font-semibold px-4 py-2">
            School Directory
          </TabsTrigger>
        </TabsList>

        <TabsContent value="submit" className="space-y-4">
          <SupportTicketForm
            userRole={Role.LIBRARIAN}
            availableTargetRoles={[Role.ADMIN]}
            categories={[
              "Library Budget / Book Purchase Request",
              "Barcode Scanner / Hardware Setup",
              "Unlisted Student / Staff User Record",
              "Catalog ISBN / Metadata Error",
              "Overdue Fine Waiver Request",
              "General Library Inquiry",
            ]}
          />
        </TabsContent>

        <TabsContent value="mytickets" className="space-y-4">
          <SupportTicketList
            tickets={mySubmittedTickets as any}
            scope="mine"
            canReply={false}
            title="My Library Support Tickets Sent to School Admin"
          />
        </TabsContent>

        <TabsContent value="faqs" className="space-y-4">
          <FaqAccordion
            faqs={LIBRARIAN_FAQS}
            title="Librarian Operational Manual & Guidelines"
            subtitle="Step-by-step guides for book cataloging, circulation, fine policies, and tenant security."
          />
        </TabsContent>

        <TabsContent value="contacts" className="space-y-4">
          <ContactCards
            contacts={[
              {
                title: "School Administration Office",
                role: "Administrative Desk",
                email: "admin@school.edu",
                phone: "+1 (800) 555-0166",
                hours: "Mon - Fri: 8:00 AM - 4:00 PM EST",
                description: "Contact for library budget approvals, lost book policy overrides, and staffing.",
                badgeText: "School Admin",
              },
              {
                title: "School IT & Barcode Support",
                role: "Technical Team",
                email: "library-it@school.edu",
                phone: "+1 (800) 555-0167",
                hours: "Mon - Fri: 8:00 AM - 4:00 PM EST",
                description: "Hardware help for barcode printers, scanners, and catalog server sync.",
                badgeText: "IT Support",
              },
            ]}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
