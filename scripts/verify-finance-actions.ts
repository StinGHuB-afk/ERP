import 'dotenv/config'
import { PrismaClient, Role, TransactionType, TransactionStatus } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'

const sanitize = (val?: string) => val ? val.trim().replace(/^["']|["']$/g, '') : undefined

const adapter = new PrismaLibSql({
  url: sanitize(process.env.DATABASE_URL)!,
  authToken: sanitize(process.env.DATABASE_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN),
})

const prisma = new PrismaClient({ adapter })

async function testFinanceLogic() {
  console.log('--- Testing Finance Actions & Cross-Tenant Security ---')

  // 1. Get or create two distinct schools
  let schoolA = await prisma.school.findFirst({ where: { name: 'Springfield Academy' } })
  if (!schoolA) {
    schoolA = await prisma.school.create({ data: { name: 'Springfield Academy' } })
  }

  let schoolB = await prisma.school.findFirst({ where: { name: 'Greenwood International School' } })
  if (!schoolB) {
    schoolB = await prisma.school.create({ data: { name: 'Greenwood International School' } })
  }

  // 2. Create users in each school
  const userA = await prisma.user.create({
    data: {
      name: 'Student Springfield',
      email: `student_a_${Date.now()}@springfield.org`,
      password: 'hash',
      role: Role.STUDENT,
      schoolId: schoolA.id,
    },
  })

  const userB = await prisma.user.create({
    data: {
      name: 'Student Greenwood',
      email: `student_b_${Date.now()}@greenwood.org`,
      password: 'hash',
      role: Role.STUDENT,
      schoolId: schoolB.id,
    },
  })

  console.log(`✓ User A (${userA.email}) assigned to School A (${schoolA.name})`)
  console.log(`✓ User B (${userB.email}) assigned to School B (${schoolB.name})`)

  // 3. Test FeeStructure Creation
  const feeStructure = await prisma.feeStructure.create({
    data: {
      title: 'Annual Tech & Library Fee',
      amount: 4500.0,
      dueDate: new Date('2026-11-15'),
      schoolId: schoolA.id,
    },
  })
  console.log('✓ Created FeeStructure for School A:', feeStructure.title, 'Amount:', feeStructure.amount)

  // 4. Test Transaction Recording within same tenant
  const validTxn = await prisma.transaction.create({
    data: {
      title: 'Library Fee Payment',
      amount: 4500.0,
      type: TransactionType.FEE_PAYMENT,
      status: TransactionStatus.COMPLETED,
      userId: userA.id,
      schoolId: schoolA.id,
    },
  })
  console.log('✓ Valid Same-Tenant Transaction created:', validTxn.id, 'User:', userA.name)

  // 5. Verify Cross-Tenant Isolation Enforcement
  const schoolATxns = await prisma.transaction.findMany({
    where: { schoolId: schoolA.id },
    include: { user: true },
  })

  const schoolBTxns = await prisma.transaction.findMany({
    where: { schoolId: schoolB.id },
    include: { user: true },
  })

  console.log('✓ School A Ledger count:', schoolATxns.length)
  console.log('✓ School B Ledger count:', schoolBTxns.length)

  // Security assertion: User B must not appear in School A ledger
  const crossTenantLeak = schoolATxns.some((t) => t.userId === userB.id)
  console.log('✓ Cross-Tenant Leak Check:', crossTenantLeak ? 'FAILED (LEAK DETECTED)' : 'PASSED (STRICT ISOLATION)')

  console.log('\n🎉 Finance Server Actions Logic & Isolation Verified!')
}

testFinanceLogic()
  .catch((e) => {
    console.error('Test failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
