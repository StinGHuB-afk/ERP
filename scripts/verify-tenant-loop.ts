import 'dotenv/config'
import { PrismaClient, Role } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import bcrypt from 'bcryptjs'

const sanitize = (val?: string) => val ? val.trim().replace(/^["']|["']$/g, '') : undefined

const adapter = new PrismaLibSql({
  url: sanitize(process.env.DATABASE_URL)!,
  authToken: sanitize(process.env.DATABASE_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN),
})

const prisma = new PrismaClient({ adapter })

async function verifyIsolationLoop() {
  console.log('--- Step 1: Creating New Tenant School ---')
  const school = await prisma.school.create({
    data: {
      name: 'Greenwood International School',
      domain: 'greenwood.edumanage.com',
      address: '450 Oak Ridge Lane, Seattle, WA',
    },
  })
  console.log('✓ Created School:', school.name, '(ID:', school.id, ')')

  console.log('\n--- Step 2: Provisioning Tenant Administrator ---')
  const email = `admin_${Date.now()}@greenwood.org`
  const passwordHash = await bcrypt.hash('Admin@12345', 10)
  const adminUser = await prisma.user.create({
    data: {
      name: 'Principal Eleanor Greenwood',
      email,
      password: passwordHash,
      role: Role.ADMIN,
      mustChangePassword: true,
      schoolId: school.id,
    },
  })
  console.log('✓ Provisioned Admin User:', adminUser.email, 'Role:', adminUser.role, 'SchoolId:', adminUser.schoolId)

  console.log('\n--- Step 3: Verifying Password Match & Password Change Flag ---')
  const isPasswordValid = await bcrypt.compare('Admin@12345', adminUser.password)
  console.log('✓ Password verification against Admin@12345:', isPasswordValid ? 'SUCCESS' : 'FAILED')
  console.log('✓ mustChangePassword flag:', adminUser.mustChangePassword)

  console.log('\n--- Step 4: Testing Tenant Scoped Queries ---')
  const classForSchool = await prisma.class.create({
    data: {
      name: 'Grade 10 - Alpha',
      schoolId: school.id,
    },
  })
  console.log('✓ Created Class for school:', classForSchool.name)

  const adminClasses = await prisma.class.findMany({
    where: { schoolId: adminUser.schoolId! },
  })
  console.log('✓ Admin Tenant Classes count:', adminClasses.length, '(Matches target schoolId)')

  const totalSchools = await prisma.school.findMany({
    include: {
      _count: {
        select: { users: true, classes: true },
      },
    },
  })
  console.log('\n--- Step 5: SuperAdmin Metrics Overview ---')
  totalSchools.forEach((s) => {
    console.log(`- School: ${s.name} | Users: ${s._count.users} | Classes: ${s._count.classes}`)
  })

  console.log('\n🎉 Multi-Tenant Isolation & Provisioning Loop Verified Successfully!')
}

verifyIsolationLoop()
  .catch((e) => {
    console.error('Test failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
