import { createClient } from "@libsql/client"
import "dotenv/config"

async function run() {
  const url = process.env.DATABASE_URL
  const authToken = process.env.DATABASE_AUTH_TOKEN

  if (!url || !authToken) {
    console.error("❌ DATABASE_URL or DATABASE_AUTH_TOKEN missing.")
    process.exit(1)
  }

  const client = createClient({ url, authToken })

  console.log("Applying Phase 1 ERP schema expansion to Turso database...")

  // 1. Column additions for Student and Teacher
  const studentColumns = [
    'ALTER TABLE "Student" ADD COLUMN "emergencyContactName" TEXT;',
    'ALTER TABLE "Student" ADD COLUMN "emergencyContactPhone" TEXT;',
    'ALTER TABLE "Student" ADD COLUMN "emergencyContactRelation" TEXT;',
    'ALTER TABLE "Student" ADD COLUMN "behavioralFlags" TEXT;'
  ]

  const teacherColumns = [
    'ALTER TABLE "Teacher" ADD COLUMN "emergencyContactName" TEXT;',
    'ALTER TABLE "Teacher" ADD COLUMN "emergencyContactPhone" TEXT;',
    'ALTER TABLE "Teacher" ADD COLUMN "emergencyContactRelation" TEXT;',
    'ALTER TABLE "Teacher" ADD COLUMN "qualification" TEXT;',
    'ALTER TABLE "Teacher" ADD COLUMN "specialization" TEXT;'
  ]

  for (const colSql of [...studentColumns, ...teacherColumns]) {
    try {
      await client.execute(colSql)
      console.log(`✓ Executed: ${colSql.split('ADD COLUMN')[1]}`)
    } catch (err: any) {
      if (err.message?.includes("duplicate column")) {
        // Column already exists, safe to ignore
      } else {
        console.log(`Note on column add: ${err.message}`)
      }
    }
  }

  // 2. Create ProfileTimelineEvent table & indexes
  try {
    await client.execute(`
      CREATE TABLE IF NOT EXISTS "ProfileTimelineEvent" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "studentId" TEXT NOT NULL,
        "eventType" TEXT NOT NULL DEFAULT 'GENERAL',
        "title" TEXT NOT NULL,
        "description" TEXT,
        "severity" TEXT,
        "metadata" TEXT,
        "actorId" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "ProfileTimelineEvent_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "ProfileTimelineEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
      );
    `)
    await client.execute(`CREATE INDEX IF NOT EXISTS "ProfileTimelineEvent_studentId_idx" ON "ProfileTimelineEvent"("studentId");`)
    await client.execute(`CREATE INDEX IF NOT EXISTS "ProfileTimelineEvent_studentId_eventType_idx" ON "ProfileTimelineEvent"("studentId", "eventType");`)
    await client.execute(`CREATE INDEX IF NOT EXISTS "ProfileTimelineEvent_createdAt_idx" ON "ProfileTimelineEvent"("createdAt");`)
    await client.execute(`CREATE INDEX IF NOT EXISTS "ProfileTimelineEvent_actorId_idx" ON "ProfileTimelineEvent"("actorId");`)
    console.log("✓ Created ProfileTimelineEvent table and indexes")
  } catch (err: any) {
    console.log("ProfileTimelineEvent error:", err.message)
  }

  // 3. Create TransportAssignment table & indexes
  try {
    await client.execute(`
      CREATE TABLE IF NOT EXISTS "TransportAssignment" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "studentId" TEXT NOT NULL UNIQUE,
        "routeId" TEXT NOT NULL,
        "routeName" TEXT NOT NULL,
        "busNumber" TEXT NOT NULL,
        "pickupPoint" TEXT NOT NULL,
        "dropPoint" TEXT NOT NULL,
        "pickupTime" TEXT,
        "dropTime" TEXT,
        "status" TEXT NOT NULL DEFAULT 'ACTIVE',
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "TransportAssignment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `)
    await client.execute(`CREATE UNIQUE INDEX IF NOT EXISTS "TransportAssignment_studentId_key" ON "TransportAssignment"("studentId");`)
    await client.execute(`CREATE INDEX IF NOT EXISTS "TransportAssignment_routeId_idx" ON "TransportAssignment"("routeId");`)
    await client.execute(`CREATE INDEX IF NOT EXISTS "TransportAssignment_busNumber_idx" ON "TransportAssignment"("busNumber");`)
    console.log("✓ Created TransportAssignment table and indexes")
  } catch (err: any) {
    console.log("TransportAssignment error:", err.message)
  }

  // 4. Create TransportChangeRequest table & indexes
  try {
    await client.execute(`
      CREATE TABLE IF NOT EXISTS "TransportChangeRequest" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "studentId" TEXT NOT NULL,
        "currentRouteId" TEXT,
        "currentRouteName" TEXT,
        "requestedRouteId" TEXT NOT NULL,
        "requestedRouteName" TEXT NOT NULL,
        "requestedBusNumber" TEXT,
        "requestedPickupPoint" TEXT,
        "requestedDropPoint" TEXT,
        "reason" TEXT,
        "status" TEXT NOT NULL DEFAULT 'PENDING',
        "approvingAdminId" TEXT,
        "rejectionReason" TEXT,
        "processedAt" DATETIME,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "TransportChangeRequest_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "TransportChangeRequest_approvingAdminId_fkey" FOREIGN KEY ("approvingAdminId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
      );
    `)
    await client.execute(`CREATE INDEX IF NOT EXISTS "TransportChangeRequest_studentId_idx" ON "TransportChangeRequest"("studentId");`)
    await client.execute(`CREATE INDEX IF NOT EXISTS "TransportChangeRequest_status_idx" ON "TransportChangeRequest"("status");`)
    await client.execute(`CREATE INDEX IF NOT EXISTS "TransportChangeRequest_approvingAdminId_idx" ON "TransportChangeRequest"("approvingAdminId");`)
    console.log("✓ Created TransportChangeRequest table and indexes")
  } catch (err: any) {
    console.log("TransportChangeRequest error:", err.message)
  }

  // 5. Create HealthRecord table & indexes
  try {
    await client.execute(`
      CREATE TABLE IF NOT EXISTS "HealthRecord" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "studentId" TEXT NOT NULL UNIQUE,
        "bloodGroup" TEXT,
        "allergies" TEXT,
        "dailyMedications" TEXT,
        "emergencyMedicalProtocol" TEXT,
        "chronicConditions" TEXT,
        "dietaryRestrictions" TEXT,
        "doctorName" TEXT,
        "doctorPhone" TEXT,
        "insuranceProvider" TEXT,
        "insurancePolicyNumber" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "HealthRecord_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `)
    await client.execute(`CREATE UNIQUE INDEX IF NOT EXISTS "HealthRecord_studentId_key" ON "HealthRecord"("studentId");`)
    console.log("✓ Created HealthRecord table and indexes")
  } catch (err: any) {
    console.log("HealthRecord error:", err.message)
  }

  // 6. Create HealthClinicVisit table & indexes
  try {
    await client.execute(`
      CREATE TABLE IF NOT EXISTS "HealthClinicVisit" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "healthRecordId" TEXT NOT NULL,
        "studentId" TEXT NOT NULL,
        "visitDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "reason" TEXT NOT NULL,
        "symptoms" TEXT,
        "treatmentGiven" TEXT,
        "medicationAdministered" TEXT,
        "nurseNotes" TEXT,
        "actionTaken" TEXT,
        "parentNotified" BOOLEAN NOT NULL DEFAULT 0,
        "parentNotifiedAt" DATETIME,
        "loggedById" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "HealthClinicVisit_healthRecordId_fkey" FOREIGN KEY ("healthRecordId") REFERENCES "HealthRecord" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "HealthClinicVisit_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "HealthClinicVisit_loggedById_fkey" FOREIGN KEY ("loggedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
      );
    `)
    await client.execute(`CREATE INDEX IF NOT EXISTS "HealthClinicVisit_studentId_idx" ON "HealthClinicVisit"("studentId");`)
    await client.execute(`CREATE INDEX IF NOT EXISTS "HealthClinicVisit_healthRecordId_idx" ON "HealthClinicVisit"("healthRecordId");`)
    await client.execute(`CREATE INDEX IF NOT EXISTS "HealthClinicVisit_visitDate_idx" ON "HealthClinicVisit"("visitDate");`)
    await client.execute(`CREATE INDEX IF NOT EXISTS "HealthClinicVisit_loggedById_idx" ON "HealthClinicVisit"("loggedById");`)
    console.log("✓ Created HealthClinicVisit table and indexes")
  } catch (err: any) {
    console.log("HealthClinicVisit error:", err.message)
  }

  console.log("✅ Turso database Phase 1 schema migration completed successfully!")
}

run()
