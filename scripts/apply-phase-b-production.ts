import 'dotenv/config'
import { createClient } from '@libsql/client'

async function run() {
  const url = process.env.DATABASE_URL
  const authToken = process.env.DATABASE_AUTH_TOKEN

  if (!url || !authToken) {
    console.error("❌ DATABASE_URL and DATABASE_AUTH_TOKEN must be set in .env")
    process.exit(1)
  }

  // Print target database without exposing secrets
  const safeUrl = url.split("?")[0]
  console.log(`🔌 Target Database: ${safeUrl}`)
  console.log(`📋 Planned Operation: ALTER TABLE "User" ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;`)

  const client = createClient({ url, authToken })

  try {
    // 1. Inspect existing columns
    console.log(`\n🔍 Checking existing User table...`)
    const tableInfo = await client.execute('PRAGMA table_info("User")')
    const hasColumn = tableInfo.rows.some((row: any) => row.name === 'mustChangePassword')

    if (hasColumn) {
      console.log(`✅ The column "mustChangePassword" already exists in production.`)
      console.log(`✨ Exiting successfully with no changes.`)
      process.exit(0)
    }

    console.log(`⚠️ Column "mustChangePassword" is missing.`)

    // 2. Check for explicit confirmation
    if (process.env.CONFIRM_PHASE_B_PRODUCTION_MIGRATION !== "true") {
      console.log(`\n🛑 Safety lock active.`)
      console.log(`Set CONFIRM_PHASE_B_PRODUCTION_MIGRATION=true to apply this change.`)
      process.exit(0)
    }

    console.log(`\n🔓 Confirmation received. Applying schema change...`)
    
    // 3. Apply the minimal additive change
    await client.execute(`ALTER TABLE "User" ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;`)
    
    console.log(`✅ Schema change applied.`)

    // 4. Post-migration verification
    console.log(`\n🔍 Verifying post-migration schema...`)
    const updatedTableInfo = await client.execute('PRAGMA table_info("User")')
    const columnExists = updatedTableInfo.rows.some((row: any) => row.name === 'mustChangePassword')

    if (columnExists) {
      console.log(`✅ Verified: "mustChangePassword" now exists.`)
    } else {
      console.error(`❌ Verification failed: Column was not found!`)
    }

    const countResult = await client.execute('SELECT COUNT(*) as count FROM "User"')
    console.log(`👥 Total users preserved: ${countResult.rows[0].count}`)

    const users = await client.execute('SELECT id, email, mustChangePassword FROM "User" LIMIT 3')
    console.log(`\n📄 Sample data (Top 3 users):`)
    console.table(users.rows)

  } catch (error) {
    console.error("❌ Error during migration:", error)
    process.exit(1)
  }
}

run()
