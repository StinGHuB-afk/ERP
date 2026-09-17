import { cache } from "react"
import { unstable_cache } from "next/cache"
import prisma from "@/lib/prisma"

// ============================================================
// 1. REACT CACHE: REQUEST-LEVEL DATA DEDUPLICATION
// ============================================================

export const getDeduplicatedSessionUser = cache(async (userId: string) => {
  if (!userId) return null
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      mustChangePassword: true,
      teacher: { select: { id: true } },
      student: { select: { id: true, classId: true } },
    },
  })
})

export const getDeduplicatedTeacherProfile = cache(async (userId: string) => {
  if (!userId) return null
  return prisma.teacher.findUnique({
    where: { userId },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  })
})

// ============================================================
// 2. UNSTABLE_CACHE: CACHED REPEAT REQUESTS FOR STRUCTURAL DATA
// ============================================================

/**
 * Globally Cached Classes Query (Revalidation Tag: 'classes-list')
 */
export const getCachedClasses = unstable_cache(
  async () => {
    return prisma.class.findMany({
      select: { id: true, name: true, teacherId: true },
      orderBy: { name: "asc" },
    })
  },
  ["global-classes-list"],
  {
    revalidate: 3600,
    tags: ["classes-list"],
  }
)

/**
 * Globally Cached Subjects Query (Revalidation Tag: 'subjects-list')
 */
export const getCachedSubjects = unstable_cache(
  async () => {
    return prisma.subject.findMany({
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    })
  },
  ["global-subjects-list"],
  {
    revalidate: 3600,
    tags: ["subjects-list"],
  }
)

export const getCachedActiveSession = unstable_cache(
  async () => {
    const settings = await prisma.schoolSettings.findUnique({
      where: { id: "default" },
      include: { activeSession: true },
    })
    return settings?.activeSession ?? null
  },
  ["active-academic-session"],
  {
    revalidate: 3600,
    tags: ["active-session"],
  }
)

export const getCachedSchoolSettings = unstable_cache(
  async () => {
    return prisma.schoolSettings.findUnique({
      where: { id: "default" },
    })
  },
  ["school-branding-settings"],
  {
    revalidate: 3600,
    tags: ["school-settings"],
  }
)
