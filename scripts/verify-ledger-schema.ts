import 'dotenv/config'
import { PrismaClient, TransactionType, TransactionStatus } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'

const sanitize = (val?: string) => val ? val.trim().replace(/^["']|["']$/g, '') : undefined

const adapter = new PrismaLibSql({
  url: sanitize(process.env.DATABASE_URL)!,
  authToken: sanitize(process.env.DATABASE_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN),
})

const prisma = new PrismaClient({ adapter })

async function verifyLedgerSchema() {
  console.log('--- Verifying Financial Ledger Schema ---')

  const school = await prisma.school.findFirst()
  const user = await prisma.user.findFirst()

  if (!school || !user) {
    console.error('No school or user found to associate test transaction with.')
    return
  }

  // 1. Create FeeStructure
  const fee = await prisma.feeStructure.create({
    data: {
      schoolId: school.id,
      title: 'Q1 Tuition & Facility Fee',
      amount: 12500.0,
      dueDate: new Date('2026-10-30'),
    },
  })
  console.log('✓ Created FeeStructure template:', fee.id, 'Title:', fee.title, 'Amount:', fee.amount)

  // 2. Create Transaction Ledger entry
  const transaction = await prisma.transaction.create({
    data: {
      schoolId: school.id,
      userId: user.id,
      amount: 12500.0,
      type: TransactionType.FEE_PAYMENT,
      status: TransactionStatus.COMPLETED,
      title: 'Q1 Tuition Fee Payment',
      description: 'Online payment received for term 1',
      referenceId: `TXN_${Date.now()}`,
    },
  })
  console.log('✓ Created Transaction entry:', transaction.id, 'Type:', transaction.type, 'Status:', transaction.status)

  // 3. Query ledger with relation includes
  const userTransactions = await prisma.transaction.findMany({
    where: { schoolId: school.id },
    include: {
      user: { select: { name: true, email: true, role: true } },
      school: { select: { name: true } },
    },
  })
  console.log('✓ Queried tenant ledger count:', userTransactions.length)
  console.log('✓ Ledger sample entry:', userTransactions[0])

  console.log('\n🎉 Financial Engine Schema Expansion Verified Successfully!')
}

verifyLedgerSchema()
  .catch((e) => {
    console.error('Ledger verification failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
