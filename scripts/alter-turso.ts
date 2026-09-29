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

  // 1. Column additions for Student, Teacher, and AcademicSession
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

  const sessionColumns = [
    'ALTER TABLE "AcademicSession" ADD COLUMN "isMarksPublished" INTEGER DEFAULT 0;'
  ]

  for (const colSql of [...studentColumns, ...teacherColumns, ...sessionColumns]) {
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
    console.log("✓ Created HealthClinicVisit table and indexes")
  } catch (err: any) {
    console.log("HealthClinicVisit error:", err.message)
  }

  // 7. Create ProfileUpdateRequest table & indexes
  try {
    await client.execute(`
      CREATE TABLE IF NOT EXISTS "ProfileUpdateRequest" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "studentId" TEXT NOT NULL,
        "requestedData" TEXT NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'PENDING',
        "approvingTeacherId" TEXT,
        "rejectionReason" TEXT,
        "processedAt" DATETIME,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "ProfileUpdateRequest_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "ProfileUpdateRequest_approvingTeacherId_fkey" FOREIGN KEY ("approvingTeacherId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
      );
    `)
    await client.execute(`CREATE INDEX IF NOT EXISTS "ProfileUpdateRequest_studentId_idx" ON "ProfileUpdateRequest"("studentId");`)
    await client.execute(`CREATE INDEX IF NOT EXISTS "ProfileUpdateRequest_status_idx" ON "ProfileUpdateRequest"("status");`)
    await client.execute(`CREATE INDEX IF NOT EXISTS "ProfileUpdateRequest_approvingTeacherId_idx" ON "ProfileUpdateRequest"("approvingTeacherId");`)
    console.log("✓ Created ProfileUpdateRequest table and indexes")
  } catch (err: any) {
    console.log("ProfileUpdateRequest error:", err.message)
  }

  // 8. Add soft-delete and proofDocumentUrl columns
  const newColumns = [
    'ALTER TABLE "User" ADD COLUMN "isArchived" BOOLEAN NOT NULL DEFAULT 0;',
    'ALTER TABLE "Student" ADD COLUMN "isArchived" BOOLEAN NOT NULL DEFAULT 0;',
    'ALTER TABLE "Teacher" ADD COLUMN "isArchived" BOOLEAN NOT NULL DEFAULT 0;',
    'ALTER TABLE "ProfileUpdateRequest" ADD COLUMN "proofDocumentUrl" TEXT;'
  ]

  for (const colSql of newColumns) {
    try {
      await client.execute(colSql)
      console.log(`✓ Executed: ${colSql}`)
    } catch (err: any) {
      if (err.message?.includes("duplicate column")) {
        // Safe to ignore
      } else {
        console.log(`Note on column add: ${err.message}`)
      }
    }
  }

  try {
    await client.execute(`CREATE INDEX IF NOT EXISTS "User_isArchived_idx" ON "User"("isArchived");`)
    await client.execute(`CREATE INDEX IF NOT EXISTS "Student_isArchived_idx" ON "Student"("isArchived");`)
    await client.execute(`CREATE INDEX IF NOT EXISTS "Teacher_isArchived_idx" ON "Teacher"("isArchived");`)
  } catch (err: any) {
    console.log("Archive index error:", err.message)
  }

  // 9. Create SubstituteAssignment table & indexes
  try {
    await client.execute(`
      CREATE TABLE IF NOT EXISTS "SubstituteAssignment" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "substituteTeacherId" TEXT NOT NULL,
        "classId" TEXT NOT NULL,
        "assignedByAdminId" TEXT NOT NULL,
        "validFrom" DATETIME NOT NULL,
        "validUntil" DATETIME NOT NULL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "SubstituteAssignment_substituteTeacherId_fkey" FOREIGN KEY ("substituteTeacherId") REFERENCES "Teacher" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "SubstituteAssignment_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "SubstituteAssignment_assignedByAdminId_fkey" FOREIGN KEY ("assignedByAdminId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `)
    await client.execute(`CREATE INDEX IF NOT EXISTS "SubstituteAssignment_substituteTeacherId_idx" ON "SubstituteAssignment"("substituteTeacherId");`)
    await client.execute(`CREATE INDEX IF NOT EXISTS "SubstituteAssignment_classId_idx" ON "SubstituteAssignment"("classId");`)
    await client.execute(`CREATE INDEX IF NOT EXISTS "SubstituteAssignment_assignedByAdminId_idx" ON "SubstituteAssignment"("assignedByAdminId");`)
    await client.execute(`CREATE INDEX IF NOT EXISTS "SubstituteAssignment_validFrom_validUntil_idx" ON "SubstituteAssignment"("validFrom", "validUntil");`)
    console.log("✓ Created SubstituteAssignment table and indexes")
  } catch (err: any) {
    console.log("SubstituteAssignment error:", err.message)
  }

  // 10. Create TimetablePeriod table & indexes
  try {
    await client.execute(`
      CREATE TABLE IF NOT EXISTS "TimetablePeriod" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "schoolId" TEXT NOT NULL,
        "classId" TEXT NOT NULL,
        "subjectId" TEXT NOT NULL,
        "teacherId" TEXT NOT NULL,
        "dayOfWeek" TEXT NOT NULL,
        "startTime" TEXT NOT NULL,
        "endTime" TEXT NOT NULL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "TimetablePeriod_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "TimetablePeriod_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "TimetablePeriod_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "TimetablePeriod_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `)
    await client.execute(`CREATE INDEX IF NOT EXISTS "TimetablePeriod_schoolId_idx" ON "TimetablePeriod"("schoolId");`)
    await client.execute(`CREATE INDEX IF NOT EXISTS "TimetablePeriod_classId_idx" ON "TimetablePeriod"("classId");`)
    await client.execute(`CREATE INDEX IF NOT EXISTS "TimetablePeriod_subjectId_idx" ON "TimetablePeriod"("subjectId");`)
    await client.execute(`CREATE INDEX IF NOT EXISTS "TimetablePeriod_teacherId_idx" ON "TimetablePeriod"("teacherId");`)
    await client.execute(`CREATE INDEX IF NOT EXISTS "TimetablePeriod_dayOfWeek_idx" ON "TimetablePeriod"("dayOfWeek");`)
    console.log("✓ Created TimetablePeriod table and indexes")
  } catch (err: any) {
    console.log("TimetablePeriod error:", err.message)
  }

  // 11. Create Assignment table & indexes
  try {
    await client.execute(`
      CREATE TABLE IF NOT EXISTS "Assignment" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "schoolId" TEXT NOT NULL,
        "classId" TEXT NOT NULL,
        "subjectId" TEXT NOT NULL,
        "teacherId" TEXT NOT NULL,
        "title" TEXT NOT NULL,
        "description" TEXT,
        "dueDate" DATETIME NOT NULL,
        "maxMarks" REAL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Assignment_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "Assignment_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "Assignment_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "Assignment_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `)
    await client.execute(`CREATE INDEX IF NOT EXISTS "Assignment_schoolId_idx" ON "Assignment"("schoolId");`)
    await client.execute(`CREATE INDEX IF NOT EXISTS "Assignment_classId_idx" ON "Assignment"("classId");`)
    await client.execute(`CREATE INDEX IF NOT EXISTS "Assignment_subjectId_idx" ON "Assignment"("subjectId");`)
    await client.execute(`CREATE INDEX IF NOT EXISTS "Assignment_teacherId_idx" ON "Assignment"("teacherId");`)
    console.log("✓ Created Assignment table and indexes")
  } catch (err: any) {
    console.log("Assignment error:", err.message)
  }

  // 12. Create AssignmentSubmission table & indexes
  try {
    await client.execute(`
      CREATE TABLE IF NOT EXISTS "AssignmentSubmission" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "assignmentId" TEXT NOT NULL,
        "studentId" TEXT NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'PENDING',
        "contentUrl" TEXT,
        "marksObtained" REAL,
        "feedback" TEXT,
        "submittedAt" DATETIME,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "AssignmentSubmission_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "AssignmentSubmission_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `)
    await client.execute(`CREATE UNIQUE INDEX IF NOT EXISTS "AssignmentSubmission_assignmentId_studentId_key" ON "AssignmentSubmission"("assignmentId", "studentId");`)
    await client.execute(`CREATE INDEX IF NOT EXISTS "AssignmentSubmission_assignmentId_idx" ON "AssignmentSubmission"("assignmentId");`)
    await client.execute(`CREATE INDEX IF NOT EXISTS "AssignmentSubmission_studentId_idx" ON "AssignmentSubmission"("studentId");`)
    await client.execute(`CREATE INDEX IF NOT EXISTS "AssignmentSubmission_status_idx" ON "AssignmentSubmission"("status");`)
    console.log("✓ Created AssignmentSubmission table and indexes")
  } catch (err: any) {
    console.log("AssignmentSubmission error:", err.message)
  }

  // 13. Create AdmissionEnquiry table & indexes
  try {
    await client.execute(`
      CREATE TABLE IF NOT EXISTS "AdmissionEnquiry" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "schoolId" TEXT NOT NULL,
        "referenceNumber" TEXT NOT NULL UNIQUE,
        "studentFirstName" TEXT NOT NULL,
        "studentLastName" TEXT NOT NULL,
        "dateOfBirth" DATETIME NOT NULL,
        "appliedForClassId" TEXT NOT NULL,
        "parentName" TEXT NOT NULL,
        "parentEmail" TEXT NOT NULL,
        "parentPhone" TEXT NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'PENDING',
        "documentUrl" TEXT,
        "adminNotes" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "AdmissionEnquiry_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "AdmissionEnquiry_appliedForClassId_fkey" FOREIGN KEY ("appliedForClassId") REFERENCES "Class" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `)
    await client.execute(`CREATE UNIQUE INDEX IF NOT EXISTS "AdmissionEnquiry_referenceNumber_key" ON "AdmissionEnquiry"("referenceNumber");`)
    await client.execute(`CREATE INDEX IF NOT EXISTS "AdmissionEnquiry_schoolId_idx" ON "AdmissionEnquiry"("schoolId");`)
    await client.execute(`CREATE INDEX IF NOT EXISTS "AdmissionEnquiry_appliedForClassId_idx" ON "AdmissionEnquiry"("appliedForClassId");`)
    await client.execute(`CREATE INDEX IF NOT EXISTS "AdmissionEnquiry_status_idx" ON "AdmissionEnquiry"("status");`)
    await client.execute(`CREATE INDEX IF NOT EXISTS "AdmissionEnquiry_referenceNumber_idx" ON "AdmissionEnquiry"("referenceNumber");`)
    console.log("✓ Created AdmissionEnquiry table and indexes")
  } catch (err: any) {
    console.log("AdmissionEnquiry error:", err.message)
  }

  console.log("✅ Turso database Online Admissions schema migration completed successfully!")
}

run()


