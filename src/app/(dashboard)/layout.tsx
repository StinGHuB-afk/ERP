import { redirect } from "next/navigation"
import prisma from "@/lib/prisma"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { verifySession } from "@/lib/auth/session"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await verifySession()

  if (!session?.userId) {
    redirect("/login")
  }

  if (session.needsPasswordChange) {
    redirect("/change-password")
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: session.userId },
    include: {
      teacher: {
        include: {
          classes: { select: { id: true } },
        },
      },
    },
  })

  const isClassTeacher = dbUser?.role === "TEACHER" && !!dbUser.teacher?.classes?.length

  if (!dbUser) {
    redirect("/login")
  }

  let settings = await prisma.schoolSettings.findUnique({
    where: { id: "default" },
    include: { activeSession: true },
  })
  if (!settings) {
    settings = await prisma.schoolSettings.create({
      data: {
        id: "default",
      },
      include: {
        activeSession: true,
      },
    })
  }

  const schoolName = settings?.schoolName || "EduManage Academy"
  const activeSessionName = settings?.activeSession?.name || "No Active Session"

  const unreadAlertsCount = await prisma.alertRecipient.count({
    where: {
      userId: session.userId,
      readAt: null,
      alert: {
        status: "PUBLISHED",
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    },
  })

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[240px_1fr] lg:grid-cols-[260px_1fr] bg-slate-50">
      {/* Sidebar Desktop Shell — Solid White Background, 1px Border, No Drop Shadows */}
      <aside className="hidden border-r border-slate-200 bg-white md:block h-screen sticky top-0">
        <Sidebar role={dbUser.role} schoolName={schoolName} isClassTeacher={isClassTeacher} />
      </aside>

      {/* Main Content Column */}
      <div className="flex flex-col flex-1 min-w-0">
        <Header
          userName={dbUser.name || dbUser.email}
          role={dbUser.role}
          academicSession={activeSessionName}
          schoolName={schoolName}
          isClassTeacher={isClassTeacher}
          unreadAlertsCount={unreadAlertsCount}
        />
        {/* Flattened Content Area — Sits directly on bg-slate-50 with consistent p-6 lg:p-8 padding */}
        <main className="flex-1 p-6 lg:p-8 bg-slate-50">{children}</main>
      </div>
    </div>
  )
}
