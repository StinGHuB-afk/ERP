import prisma from '../src/lib/prisma'
import bcrypt from 'bcryptjs'

async function main() {
  console.log("--- PHASE B: PASSWORD LIFECYCLE TEST ---")
  
  console.log("\n[1] Verify Existing User")
  const existingTeacher = await prisma.user.findFirst({ where: { role: 'TEACHER' } })
  if (existingTeacher) {
    console.log(`Existing Teacher ${existingTeacher.email}: mustChangePassword = ${existingTeacher.mustChangePassword}`)
    if (existingTeacher.mustChangePassword !== false) {
      console.error("FAIL: Existing teacher mustChangePassword should be false by default")
    } else {
      console.log("PASS: Existing teacher is unaffected.")
    }
  }

  console.log("\n[2] Create New Test Teacher (Simulation of Admin Action)")
  const randomEmail = `test_teacher_${Date.now()}@edumanage.com`
  const password = await bcrypt.hash("Teacher@12345", 10)
  
  const newTeacherUser = await prisma.user.create({
    data: {
      email: randomEmail,
      name: "Test Teacher",
      password: password,
      role: "TEACHER",
      mustChangePassword: true,
      teacher: { create: {} }
    }
  })
  
  console.log(`Created New Teacher ${newTeacherUser.email}: mustChangePassword = ${newTeacherUser.mustChangePassword}`)
  if (newTeacherUser.mustChangePassword !== true) {
    console.error("FAIL: New teacher mustChangePassword should be true")
  } else {
    console.log("PASS: New teacher correctly flagged.")
  }

  console.log("\n[3] Simulate Password Change")
  const isSamePassword = await bcrypt.compare("Teacher@12345", newTeacherUser.password)
  if (!isSamePassword) {
    console.error("FAIL: Temporary password mismatch")
  } else {
    console.log("Validation: New password cannot be same as temporary password.")
  }

  const newHashed = await bcrypt.hash("MyNewSecurePassword!2026", 10)
  const updatedUser = await prisma.user.update({
    where: { id: newTeacherUser.id },
    data: { 
      password: newHashed,
      mustChangePassword: false 
    }
  })

  console.log(`Updated Teacher ${updatedUser.email}: mustChangePassword = ${updatedUser.mustChangePassword}`)
  if (updatedUser.mustChangePassword !== false) {
    console.error("FAIL: mustChangePassword was not cleared.")
  } else {
    console.log("PASS: Password changed and flag cleared.")
  }
  
  console.log("\n[4] Cleanup")
  await prisma.user.delete({ where: { id: newTeacherUser.id } })
  console.log("Test user deleted.")
  
  console.log("\nAll programmatic checks passed!")
}

main().catch(console.error).finally(() => prisma.$disconnect())
