import 'dotenv/config'
import { PrismaClient, LeaveType, LeaveStatus, AssetCategory, AssetStatus } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'

const sanitize = (val?: string) => val ? val.trim().replace(/^["']|["']$/g, '') : undefined

const adapter = new PrismaLibSql({
  url: sanitize(process.env.DATABASE_URL)!,
  authToken: sanitize(process.env.DATABASE_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN),
})

const prisma = new PrismaClient({ adapter })

async function verifyOperationalSchema() {
  console.log('--- Verifying Operational Schema (Leaves & Assets) ---')

  const school = await prisma.school.findFirst()
  const user = await prisma.user.findFirst()

  if (!school || !user) {
    console.error('Missing school or user for testing.')
    return
  }

  // 1. Test LeaveRequest
  const leave = await prisma.leaveRequest.create({
    data: {
      schoolId: school.id,
      userId: user.id,
      type: LeaveType.CASUAL,
      status: LeaveStatus.PENDING,
      startDate: new Date('2026-11-01'),
      endDate: new Date('2026-11-03'),
      reason: 'Attending family function',
    },
  })
  console.log('✓ Created LeaveRequest:', leave.id, 'Type:', leave.type, 'Status:', leave.status)

  // 2. Test Asset
  const asset = await prisma.asset.create({
    data: {
      schoolId: school.id,
      name: 'ThinkPad T14 Workstation',
      category: AssetCategory.LAPTOP,
      status: AssetStatus.AVAILABLE,
      identifier: `SN-LEN-${Date.now()}`,
    },
  })
  console.log('✓ Created Asset:', asset.id, 'Name:', asset.name, 'Category:', asset.category)

  // 3. Query with relation includes
  const userLeaves = await prisma.leaveRequest.findMany({
    where: { schoolId: school.id },
    include: {
      user: { select: { name: true, email: true, role: true } },
    },
  })

  const schoolAssets = await prisma.asset.findMany({
    where: { schoolId: school.id },
    include: {
      assignedTo: { select: { name: true, email: true } },
    },
  })

  console.log('✓ Queried tenant LeaveRequests count:', userLeaves.length)
  console.log('✓ Queried tenant Assets count:', schoolAssets.length)

  console.log('\n🎉 HR & Operational Engine Schema Expansion Verified Successfully!')
}

verifyOperationalSchema()
  .catch((e) => {
    console.error('Verification failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
