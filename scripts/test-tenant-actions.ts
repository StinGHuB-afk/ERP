import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'

const sanitize = (val?: string) => val ? val.trim().replace(/^["']|["']$/g, '') : undefined

const adapter = new PrismaLibSql({
  url: sanitize(process.env.DATABASE_URL)!,
  authToken: sanitize(process.env.DATABASE_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN),
})

const prisma = new PrismaClient({ adapter })

async function testTenant() {
  console.log('Testing Tenant Operations in DB...')
  
  // 1. Create a test school
  const testSchool = await prisma.school.create({
    data: {
      name: 'Springfield Academy',
      domain: 'springfield.edumanage.com',
      address: '742 Evergreen Terrace, Springfield',
    },
  })
  console.log('Created school:', testSchool)

  // 2. Query schools with counts
  const schools = await prisma.school.findMany({
    include: {
      _count: {
        select: {
          users: true,
          classes: true,
          academicSessions: true,
        },
      },
    },
  })
  console.log('Queried schools count:', schools.length)
  console.log('Schools summary:', schools)
}

testTenant()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
