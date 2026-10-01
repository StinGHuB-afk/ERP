"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Role } from "@prisma/client"
import {
  LayoutDashboard,
  Users,
  BookOpen,
  GraduationCap,
  FileText,
  Building2,
  CalendarDays,
  Bell,
  Activity,
  BellRing,
  HelpCircle,
  Settings,
  Bus,
  UserCheck,
  Shield,
  DollarSign,
  Briefcase,
  Layers,
  ArrowUpRight,
} from "lucide-react"

type SidebarProps = {
  role: Role | "SUPERADMIN" | "ADMIN" | "TEACHER" | "STUDENT" | "PARENT" | "LIBRARIAN"
  schoolName: string
  isClassTeacher?: boolean
  effectiveTenantId?: string | null
}

export function Sidebar({ role, schoolName, isClassTeacher, effectiveTenantId = null }: SidebarProps) {
  const pathname = usePathname()

  const getGroupedLinks = () => {
    // Condition A: Global SaaS View
    if (role === "SUPERADMIN" && effectiveTenantId === null) {
      return [
        {
          group: "Overview",
          items: [
            { name: "SuperAdmin Hub", href: "/superadmin", icon: Shield },
          ],
        },
        {
          group: "SaaS Management",
          items: [
            { name: "Schools", href: "/superadmin", icon: Building2 },
          ],
        },
        {
          group: "System",
          items: [
            { name: "Global Settings", href: "/superadmin/settings", icon: Settings },
          ],
        },
      ]
    }

    // Condition B: Tenant Operational View (Admin or Impersonating Superadmin)
    if (role === "ADMIN" || (role === "SUPERADMIN" && effectiveTenantId !== null)) {
      return [
        {
          group: "Overview",
          items: [{ name: "Admin Dashboard", href: "/admin", icon: LayoutDashboard }],
        },
        {
          group: "Academics",
          items: [
            { name: "Classes", href: "/admin/classes", icon: BookOpen },
            { name: "Subjects", href: "/admin/subjects", icon: FileText },
            { name: "Attendance", href: "/admin/attendance", icon: CalendarDays },
            { name: "Academic Sessions", href: "/admin/academic-session", icon: CalendarDays },
            { name: "Promotions & Rollover", href: "/admin/promotions", icon: ArrowUpRight },
            { name: "Library Catalog", href: "/admin/library", icon: BookOpen },
            { name: "Transport", href: "/admin/transport", icon: Bus },
          ],
        },
        {
          group: "People & Admissions",
          items: [
            { name: "Teachers", href: "/admin/teachers", icon: Users },
            { name: "Students", href: "/admin/students", icon: GraduationCap },
            { name: "Online Admissions", href: "/admin/admissions", icon: UserCheck },
          ],
        },
        {
          group: "Communication",
          items: [
            { name: "Alerts", href: "/admin/alerts", icon: BellRing },
            { name: "Announcements", href: "/admin/announcements", icon: Bell },
          ],
        },
        {
          group: "Finance & Operations",
          items: [
            { name: "Finance & Fees", href: "/admin/finance", icon: DollarSign },
            { name: "Payroll", href: "/admin/payroll", icon: DollarSign },
            { name: "Operations & Assets", href: "/admin/operations", icon: Briefcase },
            { name: "Activity Log", href: "/admin/activity", icon: Activity },
            { name: "Settings", href: "/admin/settings", icon: Building2 },
          ],
        },
      ]
    }

    if (String(role) === "LIBRARIAN") {
      return [
        {
          group: "Library Management",
          items: [
            { name: "Library Catalog", href: "/librarian", icon: BookOpen },
          ],
        },
      ]
    }

    if (String(role) === "PARENT") {
      return [
        {
          group: "Overview",
          items: [{ name: "Parent Portal", href: "/parent", icon: LayoutDashboard }],
        },
        {
          group: "Academics & Resources",
          items: [{ name: "Library Catalog", href: "/parent/library", icon: BookOpen }],
        },
        {
          group: "Communication",
          items: [{ name: "Alerts", href: "/parent/alerts", icon: BellRing }],
        },
      ]
    }

    switch (role) {
      case "TEACHER":
      case Role.TEACHER:
        return [
          {
            group: "Overview",
            items: [
              { name: "Dashboard", href: "/teacher", icon: LayoutDashboard },
              ...(isClassTeacher ? [{ name: "My Homeroom", href: "/teacher/class", icon: Users }] : []),
            ],
          },
          {
            group: "Academics",
            items: [
              { name: "My Classes", href: "/teacher/classes", icon: BookOpen },
              { name: "Attendance", href: "/teacher/attendance", icon: CalendarDays },
              { name: "Enter Marks", href: "/teacher/marks", icon: FileText },
              { name: "At-Risk Early Alert", href: "/teacher/at-risk", icon: Activity },
              { name: "Notes & Hub", href: "/teacher/notes", icon: BookOpen },
              { name: "Library Catalog", href: "/teacher/library", icon: BookOpen },
            ],
          },
          {
            group: "People & Workflow",
            items: [
              { name: "Profile Requests", href: "/teacher/profile-requests", icon: UserCheck },
              { name: "Leave Requests", href: "/teacher/leave", icon: Briefcase },
            ],
          },
          {
            group: "Communication",
            items: [{ name: "Alerts", href: "/teacher/alerts", icon: BellRing }],
          },
        ]
      case "STUDENT":
      case Role.STUDENT:
        return [
          {
            group: "Overview",
            items: [
              { name: "Dashboard", href: "/student", icon: LayoutDashboard },
              { name: "My Results", href: "/student/results", icon: FileText },
            ],
          },
          {
            group: "Academics",
            items: [
              { name: "Learning Hub", href: "/student/learning-hub", icon: BookOpen },
              { name: "Library Catalog", href: "/student/library", icon: BookOpen },
            ],
          },
          {
            group: "Communication & Workflow",
            items: [
              { name: "Leave Requests", href: "/student/leave", icon: Briefcase },
              { name: "Inbox", href: "/student/alerts", icon: BellRing },
            ],
          },
        ]
      default:
        return []
    }
  }

  const groupedNav = getGroupedLinks()

  return (
    <div className="flex h-full w-full flex-col bg-white text-slate-900 border-r border-slate-200">
      {/* Brand Header */}
      <div className="flex h-14 items-center border-b border-slate-200 px-5">
        <Link href="/" className="flex items-center gap-2.5 font-bold text-base tracking-tight text-slate-900 hover:text-blue-600 transition-colors">
          <GraduationCap className="h-5 w-5 text-blue-600 flex-shrink-0" />
          <span className="truncate">{schoolName}</span>
        </Link>
      </div>

      {/* Navigation Body */}
      <div className="flex-1 overflow-y-auto py-4">
        <nav className="grid items-start px-3 text-xs font-medium space-y-5">
          {groupedNav.map((section) => (
            <div key={section.group}>
              <div className="mb-1.5 px-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                {section.group}
              </div>
              <div className="space-y-0.5">
                {section.items.map((link) => {
                  const Icon = link.icon
                  const isActive = pathname === link.href || (link.href !== "/admin" && link.href !== "/teacher" && link.href !== "/student" && link.href !== "/parent" && link.href !== "/superadmin" && pathname.startsWith(link.href))

                  return (
                    <Link
                      key={link.name}
                      href={link.href}
                      className={cn(
                        "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-xs font-medium transition-colors group",
                        isActive
                          ? "bg-blue-50 text-blue-700 font-semibold"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-4 w-4 flex-shrink-0",
                          isActive ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600"
                        )}
                      />
                      <span className="truncate">{link.name}</span>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      {/* Bottom Utility Footer */}
      <div className="border-t border-slate-200 p-3 space-y-0.5 text-xs">
        <Link
          href={role === Role.ADMIN || role === Role.SUPERADMIN ? "/admin/settings" : "#"}
          className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
        >
          <Settings className="h-4 w-4 text-slate-400" />
          <span>System Settings</span>
        </Link>

        <a
          href="mailto:support@edumanage.com"
          className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
        >
          <HelpCircle className="h-4 w-4 text-slate-400" />
          <span>Help & Support</span>
        </a>
      </div>
    </div>
  )
}
