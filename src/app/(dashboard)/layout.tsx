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

  const availableSessions = await prisma.academicSession.findMany({
    orderBy: { startDate: "desc" },
    select: { id: true, name: true, status: true },
  })

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

  const defaultSessionId =
    settings?.activeSessionId ||
    availableSessions.find((s) => s.status === "ACTIVE")?.id ||
    availableSessions[0]?.id ||
    ""

  const activeSessionObj = availableSessions.find((s) => s.id === defaultSessionId) || availableSessions[0]
  const activeSessionName = activeSessionObj?.name || settings?.activeSession?.name || "No Active Session"

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

  const schoolName = settings?.schoolName || "EduManage Academy"

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
      {/* Sidebar Desktop Shell */}
      <aside className="hidden border-r border-slate-200 bg-white md:block h-screen sticky top-0">
        <Sidebar role={dbUser.role} schoolName={schoolName} isClassTeacher={isClassTeacher} />
      </aside>

      {/* Main Content Column */}
      <div className="flex flex-col flex-1 min-w-0">
        <Header
          userName={dbUser.name || dbUser.email}
          role={dbUser.role}
          academicSession={activeSessionName}
          sessions={availableSessions}
          currentSessionId={defaultSessionId}
          schoolName={schoolName}
          isClassTeacher={isClassTeacher}
          unreadAlertsCount={unreadAlertsCount}
        />
        {/* Content Area */}
        <main className="flex-1 p-6 lg:p-8 bg-slate-50">{children}</main>
      </div>
    </div>
  )
}
