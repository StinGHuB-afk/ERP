"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
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
} from "lucide-react"

type SidebarProps = {
  role: "ADMIN" | "TEACHER" | "STUDENT" | "PARENT"
  schoolName: string
  isClassTeacher?: boolean
}

export function Sidebar({ role, schoolName, isClassTeacher }: SidebarProps) {
  const pathname = usePathname()

  const getGroupedLinks = () => {
    switch (role) {
      case "PARENT":
        return [
          {
            group: "Overview",
            items: [{ name: "Parent Portal", href: "/parent", icon: LayoutDashboard }],
          },
        ]
      case "ADMIN":
        return [
          {
            group: "Overview",
            items: [{ name: "Dashboard", href: "/admin", icon: LayoutDashboard }],
          },
          {
            group: "Academics",
            items: [
              { name: "Classes", href: "/admin/classes", icon: BookOpen },
              { name: "Subjects", href: "/admin/subjects", icon: FileText },
              { name: "Attendance", href: "/admin/attendance", icon: CalendarDays },
            ],
          },
          {
            group: "People",
            items: [
              { name: "Teachers", href: "/admin/teachers", icon: Users },
              { name: "Students", href: "/admin/students", icon: GraduationCap },
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
            group: "System",
            items: [
              { name: "Activity Log", href: "/admin/activity", icon: Activity },
              { name: "Settings", href: "/admin/settings", icon: Building2 },
            ],
          },
        ]
      case "TEACHER":
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
              { name: "Notes & Hub", href: "/teacher/notes", icon: BookOpen },
            ],
          },
          {
            group: "Communication",
            items: [{ name: "Alerts", href: "/teacher/alerts", icon: BellRing }],
          },
        ]
      case "STUDENT":
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
            items: [{ name: "Learning Hub", href: "/student/learning-hub", icon: BookOpen }],
          },
          {
            group: "Communication",
            items: [{ name: "Inbox", href: "/student/alerts", icon: BellRing }],
          },
        ]
      default:
        return []
    }
  }

  const groupedNav = getGroupedLinks()

  return (
    <div className="flex h-full w-full flex-col bg-white text-slate-900 border-r border-slate-200">
      {/* Brand Header — Bare Icon, No Squircle Container */}
      <div className="flex h-14 items-center border-b border-slate-200 px-5">
        <Link href="/" className="flex items-center gap-2.5 font-bold text-base tracking-tight text-slate-900 hover:text-blue-600 transition-colors">
          <GraduationCap className="h-5 w-5 text-blue-600 flex-shrink-0" />
          <span className="truncate">{schoolName}</span>
        </Link>
      </div>

      {/* Navigation Body — Bare Icons, Clean Hover States */}
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
                  const isActive = pathname === link.href || (link.href !== "/admin" && link.href !== "/teacher" && link.href !== "/student" && link.href !== "/parent" && pathname.startsWith(link.href))

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

      {/* Bottom Utility Footer — Inline Links (Replaces Floating Action Buttons) */}
      <div className="border-t border-slate-200 p-3 space-y-0.5 text-xs">
        <Link
          href={role === "ADMIN" ? "/admin/settings" : "#"}
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
