import { PrismaClient } from "@prisma/client"
import { PrismaLibSql } from "@prisma/adapter-libsql"
import "dotenv/config"

import { createClient } from "@libsql/client"

const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL || "file:./dev.db",
  authToken: process.env.DATABASE_AUTH_TOKEN,
})
const prisma = new PrismaClient({ adapter })

async function migrateLegacyEnrollments() {
  console.log("🚀 Starting Phase C Data Migration: Legacy classId to StudentEnrollment engine...")

  // Ensure columns exist on remote database
  if (process.env.DATABASE_URL && process.env.DATABASE_AUTH_TOKEN) {
    const client = createClient({
      url: process.env.DATABASE_URL,
      authToken: process.env.DATABASE_AUTH_TOKEN,
    })
    const alterStatements = [
      'ALTER TABLE "StudentEnrollment" ADD COLUMN "startDate" DATETIME;',
      'ALTER TABLE "StudentEnrollment" ADD COLUMN "endDate" DATETIME;',
      'ALTER TABLE "StudentEnrollment" ADD COLUMN "transferDate" DATETIME;',
      'ALTER TABLE "StudentEnrollment" ADD COLUMN "transferReason" TEXT;'
    ]
    for (const sql of alterStatements) {
      try {
        await client.execute(sql)
      } catch (e) {
        // ignore if column exists
      }
    }
  }

  // 1. Resolve Active Academic Session
  const settings = await prisma.schoolSettings.findUnique({
    where: { id: "default" },
    include: { activeSession: true },
  })

  let activeSessionId = settings?.activeSessionId

  if (!activeSessionId) {
    console.log("⚠️ No active session set in SchoolSettings. Resolving current session...")
    let activeSession = await prisma.academicSession.findFirst({
      where: { status: "ACTIVE" },
    })

    if (!activeSession) {
      activeSession = await prisma.academicSession.create({
        data: {
          name: "2025-2026",
          startDate: new Date("2025-04-01"),
          endDate: new Date("2026-03-31"),
          status: "ACTIVE",
        },
      })
    }
    activeSessionId = activeSession.id
  }

  console.log(`📌 Using Academic Session ID: ${activeSessionId}`)

  // 2. Fetch Students with Legacy classId
  const studentsWithLegacyClass = await prisma.student.findMany({
    where: {
      classId: { not: null },
    },
    select: {
      id: true,
      classId: true,
    },
  })

  console.log(`Found ${studentsWithLegacyClass.length} students with legacy classId assignments.`)

  let createdCount = 0
  let skippedCount = 0

  // 3. Migrate Records Safely (Prevent Overlapping ACTIVE Enrollments)
  for (const student of studentsWithLegacyClass) {
    if (!student.classId) continue

    // Check if an ACTIVE enrollment already exists for this student & session
    const existingEnrollment = await prisma.studentEnrollment.findFirst({
      where: {
        studentId: student.id,
        academicSessionId: activeSessionId,
        status: "ACTIVE",
      },
    })

    if (existingEnrollment) {
      skippedCount++
      continue
    }

    // Create Canonical StudentEnrollment Record
    await prisma.studentEnrollment.create({
      data: {
        studentId: student.id,
        classId: student.classId,
        academicSessionId: activeSessionId,
        status: "ACTIVE",
      },
    })
    createdCount++
  }

  console.log(`✅ Phase C Data Migration Complete:`)
  console.log(`   - Created: ${createdCount} new StudentEnrollment records`)
  console.log(`   - Skipped: ${skippedCount} already-migrated students`)
}

migrateLegacyEnrollments()
  .catch((e) => {
    console.error("❌ Migration failed:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
