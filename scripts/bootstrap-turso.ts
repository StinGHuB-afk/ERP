import { createClient } from "@libsql/client"
import * as fs from "fs"
import * as path from "path"
import "dotenv/config"

async function bootstrap() {
  const url = process.env.DATABASE_URL
  const authToken = process.env.DATABASE_AUTH_TOKEN

  if (!url || !authToken) {
    console.error("❌ DATABASE_URL and DATABASE_AUTH_TOKEN must be set in .env")
    process.exit(1)
  }

  console.log(`Connecting to Turso: ${url}`)

  const client = createClient({
    url,
    authToken,
  })

  const sqlPath = path.join(process.cwd(), "prisma", "schema.sql")
  
  if (!fs.existsSync(sqlPath)) {
    console.error(`❌ SQL file not found at ${sqlPath}`)
    process.exit(1)
  }

  // PowerShell redirection > creates UTF-16LE encoded files by default on Windows
  let sql = fs.readFileSync(sqlPath, "utf16le")
  
  // If it wasn't utf16le (e.g. no BOM or null bytes), fallback to utf-8 just in case
  if (sql.indexOf('\0') === -1 && !sql.startsWith('\uFEFF')) {
     sql = fs.readFileSync(sqlPath, "utf-8")
  }

  console.log("Executing schema.sql on remote database...")
  
  try {
    // Add missing StudentEnrollment columns if table exists
    const alterCols = [
      'ALTER TABLE "StudentEnrollment" ADD COLUMN "startDate" DATETIME DEFAULT CURRENT_TIMESTAMP;',
      'ALTER TABLE "StudentEnrollment" ADD COLUMN "endDate" DATETIME;',
      'ALTER TABLE "StudentEnrollment" ADD COLUMN "transferDate" DATETIME;',
      'ALTER TABLE "StudentEnrollment" ADD COLUMN "transferReason" TEXT;',
      'ALTER TABLE "StudentAcademicRecord" ADD COLUMN "verificationCode" TEXT;',
      'ALTER TABLE "StudentAcademicRecord" ADD COLUMN "isRevoked" BOOLEAN DEFAULT 0;',
      'ALTER TABLE "StudentAcademicRecord" ADD COLUMN "revokedAt" DATETIME;',
      'ALTER TABLE "StudentAcademicRecord" ADD COLUMN "revokedReason" TEXT;',
      'ALTER TABLE "User" ADD COLUMN "failedLoginAttempts" INTEGER DEFAULT 0;',
      'ALTER TABLE "User" ADD COLUMN "lockedUntil" DATETIME;',
      'ALTER TABLE "Student" ADD COLUMN "status" TEXT DEFAULT \'ACTIVE\';',
      'ALTER TABLE "TeachingAssignment" ADD COLUMN "startDate" DATETIME DEFAULT CURRENT_TIMESTAMP;',
      'ALTER TABLE "TeachingAssignment" ADD COLUMN "endDate" DATETIME;',
      'ALTER TABLE "Attendance" ADD COLUMN "subjectId" TEXT;',
      'ALTER TABLE "Subject" ADD COLUMN "gradingScale" TEXT DEFAULT \'PERCENTAGE\';',
      'ALTER TABLE "ActivityLog" ADD COLUMN "userId" TEXT DEFAULT \'\';',
      'ALTER TABLE "ActivityLog" ADD COLUMN "actionType" TEXT DEFAULT \'GENERAL\';',
      'ALTER TABLE "ActivityLog" ADD COLUMN "targetEntity" TEXT DEFAULT \'SYSTEM\';',
      'ALTER TABLE "ActivityLog" ADD COLUMN "targetId" TEXT DEFAULT \'\';',
      'ALTER TABLE "ActivityLog" ADD COLUMN "oldData" TEXT;',
      'ALTER TABLE "ActivityLog" ADD COLUMN "newData" TEXT;',
      'CREATE TABLE IF NOT EXISTS "School" ("id" TEXT NOT NULL PRIMARY KEY, "name" TEXT NOT NULL, "domain" TEXT, "address" TEXT, "logoUrl" TEXT, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP);',
      'CREATE UNIQUE INDEX IF NOT EXISTS "School_domain_key" ON "School"("domain");',
      'ALTER TABLE "User" ADD COLUMN "schoolId" TEXT;',
      'ALTER TABLE "Class" ADD COLUMN "schoolId" TEXT;',
      'ALTER TABLE "AcademicSession" ADD COLUMN "schoolId" TEXT;',
      'CREATE INDEX IF NOT EXISTS "User_schoolId_idx" ON "User"("schoolId");',
      'CREATE INDEX IF NOT EXISTS "Class_schoolId_idx" ON "Class"("schoolId");',
      'CREATE INDEX IF NOT EXISTS "AcademicSession_schoolId_idx" ON "AcademicSession"("schoolId");',
      'CREATE TABLE IF NOT EXISTS "Transaction" ("id" TEXT NOT NULL PRIMARY KEY, "schoolId" TEXT NOT NULL, "userId" TEXT NOT NULL, "amount" REAL NOT NULL, "type" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT \'PENDING\', "title" TEXT NOT NULL, "description" TEXT, "referenceId" TEXT, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP);',
      'CREATE UNIQUE INDEX IF NOT EXISTS "Transaction_referenceId_key" ON "Transaction"("referenceId");',
      'CREATE INDEX IF NOT EXISTS "Transaction_schoolId_idx" ON "Transaction"("schoolId");',
      'CREATE INDEX IF NOT EXISTS "Transaction_userId_idx" ON "Transaction"("userId");',
      'CREATE INDEX IF NOT EXISTS "Transaction_status_idx" ON "Transaction"("status");',
      'CREATE INDEX IF NOT EXISTS "Transaction_type_idx" ON "Transaction"("type");',
      'CREATE TABLE IF NOT EXISTS "FeeStructure" ("id" TEXT NOT NULL PRIMARY KEY, "schoolId" TEXT NOT NULL, "classId" TEXT, "title" TEXT NOT NULL, "amount" REAL NOT NULL, "dueDate" DATETIME NOT NULL, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP);',
      'CREATE INDEX IF NOT EXISTS "FeeStructure_schoolId_idx" ON "FeeStructure"("schoolId");',
      'CREATE INDEX IF NOT EXISTS "FeeStructure_classId_idx" ON "FeeStructure"("classId");',
      'CREATE TABLE IF NOT EXISTS "LeaveRequest" ("id" TEXT NOT NULL PRIMARY KEY, "schoolId" TEXT NOT NULL, "userId" TEXT NOT NULL, "type" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT \'PENDING\', "startDate" DATETIME NOT NULL, "endDate" DATETIME NOT NULL, "reason" TEXT NOT NULL, "reviewerId" TEXT, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP);',
      'CREATE INDEX IF NOT EXISTS "LeaveRequest_schoolId_idx" ON "LeaveRequest"("schoolId");',
      'CREATE INDEX IF NOT EXISTS "LeaveRequest_userId_idx" ON "LeaveRequest"("userId");',
      'CREATE INDEX IF NOT EXISTS "LeaveRequest_reviewerId_idx" ON "LeaveRequest"("reviewerId");',
      'CREATE INDEX IF NOT EXISTS "LeaveRequest_status_idx" ON "LeaveRequest"("status");',
      'CREATE TABLE IF NOT EXISTS "Asset" ("id" TEXT NOT NULL PRIMARY KEY, "schoolId" TEXT NOT NULL, "name" TEXT NOT NULL, "category" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT \'AVAILABLE\', "identifier" TEXT, "assignedToId" TEXT, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP);',
      'CREATE INDEX IF NOT EXISTS "Asset_schoolId_idx" ON "Asset"("schoolId");',
      'CREATE INDEX IF NOT EXISTS "Asset_assignedToId_idx" ON "Asset"("assignedToId");',
      'CREATE INDEX IF NOT EXISTS "Asset_status_idx" ON "Asset"("status");',
      'CREATE INDEX IF NOT EXISTS "Asset_category_idx" ON "Asset"("category");'
    ]
    for (const alterSql of alterCols) {
      try {
        await client.execute(alterSql)
        console.log(`Executed: ${alterSql}`)
      } catch (e) {
        // Column already exists, ignore
      }
    }
    const sqlStatements = sql
      .split(";")
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0)
      .map(stmt => {
        // Strip comments
        let cleaned = stmt.split('\n').filter(line => !line.trim().startsWith('--')).join('\n').trim();
        // Add IF NOT EXISTS to prevent errors if running multiple times
        cleaned = cleaned.replace(/^CREATE TABLE "([^"]+)"/i, 'CREATE TABLE IF NOT EXISTS "$1"');
        cleaned = cleaned.replace(/^CREATE UNIQUE INDEX "([^"]+)"/i, 'CREATE UNIQUE INDEX IF NOT EXISTS "$1"');
        cleaned = cleaned.replace(/^CREATE INDEX "([^"]+)"/i, 'CREATE INDEX IF NOT EXISTS "$1"');
        return cleaned;
      })
      .filter(stmt => stmt.length > 0);

    console.log(`Parsed ${sqlStatements.length} statements. Executing sequentially...`);
    
    for (let i = 0; i < sqlStatements.length; i++) {
      const stmt = sqlStatements[i];
      try {
        await client.execute(stmt);
      } catch (err: any) {
        if (err.message && (err.message.includes("already exists") || err.message.includes("duplicate column"))) {
          console.log(`Statement ${i + 1} skipped: already exists.`);
        } else {
          console.error(`❌ Error executing statement ${i + 1}:\n${stmt}\n`, err);
          // Let's log the full error cause to see the HTTP response body if available
          if (err.cause) console.error("Cause:", err.cause);
          process.exit(1);
        }
      }
    }

    console.log("✅ Turso database schema initialized successfully.")
    
    // Verify by querying a table
    const result = await client.execute("SELECT name FROM sqlite_master WHERE type='table';")
    console.log("Created tables:")
    result.rows.forEach(row => console.log(` - ${row.name}`))
    
  } catch (error) {
    console.error("❌ Failed to initialize remote database schema:", error)
    process.exit(1)
  }
}

bootstrap()
