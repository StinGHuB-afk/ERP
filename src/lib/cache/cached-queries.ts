import { cache } from "react"
import { unstable_cache } from "next/cache"
import prisma from "@/lib/prisma"

// ============================================================
// 1. REACT CACHE: REQUEST-LEVEL DATA DEDUPLICATION
// Deduplicates queries within the exact same render tree to eliminate duplicate Turso round-trips.
// ============================================================

/**
 * Deduplicated User Profile Fetcher
 * Ensures multiple components requesting user identity during the same render cycle
 * trigger only a single database query.
 */
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

/**
 * Deduplicated Teacher Profile Fetcher
 */
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
// 2. UNSTABLE_CACHE: STRATEGIC ISR FOR STATIC STRUCTURAL DATA
// Caches global metadata with 1-hour revalidation (3600s) and tag-based invalidation.
// ============================================================

/**
 * Globally Cached Subject List Query (ISR: 3600s)
 */
export const getCachedSubjects = unstable_cache(
  async () => {
    return prisma.subject.findMany({
      select: {
        id: true,
        name: true,
        code: true,
      },
      orderBy: { name: "asc" },
    })
  },
  ["global-subjects-list"],
  {
    revalidate: 3600, // Revalidate every 1 hour
    tags: ["global-subjects"],
  }
)

/**
 * Globally Cached Active Academic Session Query (ISR: 3600s)
 */
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

/**
 * Globally Cached School Branding Settings (ISR: 3600s)
 */
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
