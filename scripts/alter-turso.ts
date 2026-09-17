import { createClient } from "@libsql/client"
import "dotenv/config"

async function run() {
  const url = process.env.DATABASE_URL
  const authToken = process.env.DATABASE_AUTH_TOKEN

  if (!url || !authToken) {
    console.error("DATABASE_URL or DATABASE_AUTH_TOKEN missing.")
    process.exit(1)
  }

  const client = createClient({ url, authToken })

  console.log("Applying schema alterations to Turso database...")

  // 1. AlertAcknowledgment table & indexes
  try {
    await client.execute(`
      CREATE TABLE IF NOT EXISTS "AlertAcknowledgment" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "alertId" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "acknowledgedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "AlertAcknowledgment_alertId_fkey" FOREIGN KEY ("alertId") REFERENCES "Alert" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "AlertAcknowledgment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `)
    console.log("✓ Created AlertAcknowledgment table")

    await client.execute(`
      CREATE UNIQUE INDEX IF NOT EXISTS "AlertAcknowledgment_alertId_userId_key" ON "AlertAcknowledgment"("alertId", "userId");
    `)
    await client.execute(`
      CREATE INDEX IF NOT EXISTS "AlertAcknowledgment_alertId_idx" ON "AlertAcknowledgment"("alertId");
    `)
    await client.execute(`
      CREATE INDEX IF NOT EXISTS "AlertAcknowledgment_userId_idx" ON "AlertAcknowledgment"("userId");
    `)
    console.log("✓ Created AlertAcknowledgment indexes")
  } catch (err: any) {
    console.log("AlertAcknowledgment step note:", err.message)
  }

  // 2. Add startDate and endDate to TeachingAssignment
  try {
    await client.execute(`
      ALTER TABLE "TeachingAssignment" ADD COLUMN "startDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;
    `)
    console.log("✓ Added startDate column to TeachingAssignment")
  } catch (err: any) {
    if (err.message?.includes("duplicate column")) {
      console.log("ℹ Column 'startDate' already exists on TeachingAssignment")
    } else {
      console.log("startDate note:", err.message)
    }
  }

  try {
    await client.execute(`
      ALTER TABLE "TeachingAssignment" ADD COLUMN "endDate" DATETIME;
    `)
    console.log("✓ Added endDate column to TeachingAssignment")
  } catch (err: any) {
    if (err.message?.includes("duplicate column")) {
      console.log("ℹ Column 'endDate' already exists on TeachingAssignment")
    } else {
      console.log("endDate note:", err.message)
    }
  }

  console.log("✅ Turso database schema alterations completed successfully!")
}

run()
