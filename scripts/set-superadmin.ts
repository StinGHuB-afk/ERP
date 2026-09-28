import 'dotenv/config'
import { PrismaClient, Role } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'

const sanitize = (val?: string) => val ? val.trim().replace(/^["']|["']$/g, '') : undefined

const adapter = new PrismaLibSql({
  url: sanitize(process.env.DATABASE_URL)!,
  authToken: sanitize(process.env.DATABASE_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN),
})

const prisma = new PrismaClient({ adapter })

async function main() {
  const result = await prisma.user.updateMany({
    where: { email: 'admin@school.com' },
    data: { role: Role.SUPERADMIN },
  })
  console.log('Successfully updated admin@school.com to SUPERADMIN. Count:', result.count)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
