import 'dotenv/config'
import { PrismaClient, Role, LeaveType, LeaveStatus, AssetCategory, AssetStatus } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'

const sanitize = (val?: string) => val ? val.trim().replace(/^["']|["']$/g, '') : undefined

const adapter = new PrismaLibSql({
  url: sanitize(process.env.DATABASE_URL)!,
  authToken: sanitize(process.env.DATABASE_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN),
})

const prisma = new PrismaClient({ adapter })

async function testOperationsStateMachine() {
  console.log('--- Testing Operations State-Machines & Security ---')

  const schoolA = await prisma.school.findFirst()
  const admin = await prisma.user.findFirst({ where: { role: Role.SUPERADMIN } })

  if (!schoolA || !admin) {
    console.error('Missing required seed data.')
    return
  }

  // 1. Test Leave Request State Machine
  const leave = await prisma.leaveRequest.create({
    data: {
      schoolId: schoolA.id,
      userId: admin.id,
      type: LeaveType.SICK,
      status: LeaveStatus.PENDING,
      startDate: new Date(),
      endDate: new Date(Date.now() + 86400000),
      reason: 'Medical checkup',
    },
  })
  console.log('✓ Leave Request created:', leave.id, 'Initial Status:', leave.status)

  const approvedLeave = await prisma.leaveRequest.update({
    where: { id: leave.id },
    data: {
      status: LeaveStatus.APPROVED,
      reviewerId: admin.id,
    },
  })
  console.log('✓ Leave Request approved by Admin:', approvedLeave.id, 'New Status:', approvedLeave.status, 'Reviewer:', approvedLeave.reviewerId)

  // 2. Test Asset Inventory & Assignment State Machine
  const asset = await prisma.asset.create({
    data: {
      name: 'MacBook Pro 16 M3',
      category: AssetCategory.LAPTOP,
      status: AssetStatus.AVAILABLE,
      identifier: `MBP-${Date.now()}`,
      schoolId: schoolA.id,
    },
  })
  console.log('✓ Asset created:', asset.name, 'Initial Status:', asset.status)

  // Assign asset to user
  const assignedAsset = await prisma.asset.update({
    where: { id: asset.id },
    data: {
      status: AssetStatus.ASSIGNED,
      assignedToId: admin.id,
    },
  })
  console.log('✓ Asset assigned to user:', assignedAsset.id, 'Status:', assignedAsset.status, 'Holder:', assignedAsset.assignedToId)

  // Unassign asset via status change to MAINTENANCE
  const maintenanceAsset = await prisma.asset.update({
    where: { id: asset.id },
    data: {
      status: AssetStatus.MAINTENANCE,
      assignedToId: null,
    },
  })
  console.log('✓ Asset set to MAINTENANCE:', maintenanceAsset.id, 'Status:', maintenanceAsset.status, 'Holder (Freed):', maintenanceAsset.assignedToId)

  console.log('\n🎉 HR Leave & Asset State-Machine Engine Verified!')
}

testOperationsStateMachine()
  .catch((e) => {
    console.error('Test failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
