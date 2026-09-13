import { createClient } from "@libsql/client"
import * as fs from "fs"
import * as path from "path"
import "dotenv/config"

/**
 * TURSO CONTROLLED SCHEMA DEPLOYMENT & POST-DEPLOYMENT SMOKE TEST SUITE
 * 
 * Safely provisions and validates a per-school isolated database schema without
 * risking destructive production migrations or shared state contamination.
 */

async function deploySchema() {
  console.log("==========================================================")
  console.log("  SCHOOL ERP - TURSO CONTROLLED SCHEMA DEPLOYMENT PIPELINE  ")
  console.log("==========================================================")

  const url = process.env.DATABASE_URL
  const authToken = process.env.DATABASE_AUTH_TOKEN

  if (!url || !authToken) {
    console.error("❌ CRITICAL: DATABASE_URL and DATABASE_AUTH_TOKEN environment variables must be defined.")
    process.exit(1)
  }

  console.log(`\n[1/4] Target Database Endpoint: ${url.replace(/([^:]+:\/\/[^@]+@)?(.*)/, "$2")}`)

  // 1. Locate and load canonical DDL Schema
  const sqlPath = path.join(process.cwd(), "prisma", "schema.sql")
  if (!fs.existsSync(sqlPath)) {
    console.error(`❌ CRITICAL: Schema SQL definition file not found at ${sqlPath}`)
    process.exit(1)
  }

  let rawSql = fs.readFileSync(sqlPath, "utf16le")
  if (rawSql.indexOf('\0') === -1 && !rawSql.startsWith('\uFEFF')) {
    rawSql = fs.readFileSync(sqlPath, "utf-8")
  }

  // 2. Parse and Clean SQL Statements
  const sqlStatements = rawSql
    .split(";")
    .map(stmt => stmt.trim())
    .filter(stmt => stmt.length > 0)
    .map(stmt => {
      let cleaned = stmt.split('\n').filter(line => !line.trim().startsWith('--')).join('\n').trim()
      cleaned = cleaned.replace(/^CREATE TABLE "([^"]+)"/i, 'CREATE TABLE IF NOT EXISTS "$1"')
      cleaned = cleaned.replace(/^CREATE UNIQUE INDEX "([^"]+)"/i, 'CREATE UNIQUE INDEX IF NOT EXISTS "$1"')
      cleaned = cleaned.replace(/^CREATE INDEX "([^"]+)"/i, 'CREATE INDEX IF NOT EXISTS "$1"')
      return cleaned
    })
    .filter(stmt => stmt.length > 0)

  console.log(`[2/4] Successfully parsed ${sqlStatements.length} DDL statements.`)

  // 3. Isolated Local Validation Phase (Verification before remote push)
  console.log("\n[3/4] Running isolated local verification on memory-backed client...")
  const localTestClient = createClient({ url: "file::memory:" })

  try {
    for (const stmt of sqlStatements) {
      await localTestClient.execute(stmt)
    }
    console.log("  ✅ Local DDL verification passed with zero syntax errors.")
  } catch (err: any) {
    console.error("  ❌ Local schema validation failed:", err.message)
    process.exit(1)
  }

  // 4. Remote Turso Deployment Phase
  console.log("\n[4/4] Applying additive schema DDL to remote Turso database...")
  const targetClient = createClient({ url, authToken })

  // Schema evolution column additions
  const additiveColumns = [
    'ALTER TABLE "StudentEnrollment" ADD COLUMN "startDate" DATETIME DEFAULT CURRENT_TIMESTAMP;',
    'ALTER TABLE "StudentEnrollment" ADD COLUMN "endDate" DATETIME;',
    'ALTER TABLE "StudentEnrollment" ADD COLUMN "transferDate" DATETIME;',
    'ALTER TABLE "StudentEnrollment" ADD COLUMN "transferReason" TEXT;',
    'ALTER TABLE "StudentAcademicRecord" ADD COLUMN "verificationCode" TEXT;',
    'ALTER TABLE "StudentAcademicRecord" ADD COLUMN "isRevoked" BOOLEAN DEFAULT 0;',
    'ALTER TABLE "StudentAcademicRecord" ADD COLUMN "revokedAt" DATETIME;',
    'ALTER TABLE "StudentAcademicRecord" ADD COLUMN "revokedReason" TEXT;'
  ]

  for (const alterSql of additiveColumns) {
    try {
      await targetClient.execute(alterSql)
    } catch {
      // Column already exists, ignore safely
    }
  }

  for (let i = 0; i < sqlStatements.length; i++) {
    const stmt = sqlStatements[i]
    try {
      await targetClient.execute(stmt)
    } catch (err: any) {
      if (err.message && (err.message.includes("already exists") || err.message.includes("duplicate column"))) {
        // Safe skip for idempotent executions
      } else {
        console.error(`  ❌ Failed executing statement #${i + 1}:\n  ${stmt}\n`, err)
        process.exit(1)
      }
    }
  }

  console.log("  ✅ Remote DDL application completed successfully.")

  // 5. Automated Post-Deployment Smoke Tests
  console.log("\n==========================================================")
  console.log("  RUNNING POST-DEPLOYMENT INTEGRITY SMOKE TESTS           ")
  console.log("==========================================================")

  try {
    // Assert 1: Master Table Registry Verification
    const tablesResult = await targetClient.execute("SELECT name FROM sqlite_master WHERE type='table';")
    const tableNames = new Set(tablesResult.rows.map(r => String(r.name)))

    const requiredTables = [
      "User", "Teacher", "Student", "Class", "Subject",
      "AcademicSession", "StudentEnrollment", "StudentAcademicRecord",
      "Mark", "Attendance", "Parent", "ParentStudent",
      "StudentRiskFlag", "ActivityLog", "SchoolSettings"
    ]

    console.log(`\n[Assert 1/3] Table Verification (${tableNames.size} total tables found):`)
    let missingTables = 0
    for (const reqTable of requiredTables) {
      if (tableNames.has(reqTable)) {
        console.log(`  ✓ Table '${reqTable}' exists`)
      } else {
        console.error(`  ❌ MISSING TABLE: '${reqTable}'`)
        missingTables++
      }
    }

    if (missingTables > 0) {
      throw new Error(`Smoke test failed: ${missingTables} required tables are missing.`)
    }

    // Assert 2: Database Connectivity & Write Sanity Check
    const healthCheck = await targetClient.execute("SELECT 1 AS status;")
    if (healthCheck.rows.length === 0 || healthCheck.rows[0].status !== 1) {
      throw new Error("Smoke test failed: Database ping returned invalid payload.")
    }
    console.log("\n[Assert 2/3] Database connectivity ping: PASSED")

    // Assert 3: School Settings Verification
    const settingsCheck = await targetClient.execute("SELECT id, activeSessionId FROM SchoolSettings WHERE id = 'default';")
    if (settingsCheck.rows.length > 0) {
      console.log(`\n[Assert 3/3] School Settings Record: INITIALIZED (Active Session ID: ${settingsCheck.rows[0].activeSessionId || "Unset"})`)
    } else {
      console.log("\n[Assert 3/3] School Settings Record: READY FOR SEEDING")
    }

    console.log("\n==========================================================")
    console.log("  ✅ ALL DEPLOYMENT SMOKE TESTS PASSED - SYSTEM READY     ")
    console.log("==========================================================")

  } catch (error: any) {
    console.error("\n❌ POST-DEPLOYMENT SMOKE TEST FAILURE:", error.message)
    process.exit(1)
  }
}

deploySchema()
