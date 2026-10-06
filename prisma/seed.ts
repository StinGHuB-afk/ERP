import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import bcrypt from 'bcryptjs'

const sanitize = (val?: string) => val ? val.trim().replace(/^["']|["']$/g, '') : undefined

const adapter = new PrismaLibSql({
  url: sanitize(process.env.DATABASE_URL)!,
  authToken: sanitize(process.env.DATABASE_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN),
})

const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('==========================================================')
  console.log('  SCHOOL ERP - COMPLETE DATABASE RE-SEED PIPELINE         ')
  console.log('==========================================================\n')

  // 1. SAFE DELETION ORDER
  console.log('[1/7] Wiping existing data...')
  await prisma.borrowRecord.deleteMany()
  await prisma.book.deleteMany()
  await prisma.payslip.deleteMany()
  await prisma.payrollRun.deleteMany()
  await prisma.salaryStructure.deleteMany()
  await prisma.admissionEnquiry.deleteMany()
  await prisma.assignmentSubmission.deleteMany()
  await prisma.assignment.deleteMany()
  await prisma.timetablePeriod.deleteMany()
  await prisma.asset.deleteMany()
  await prisma.leaveRequest.deleteMany()
  await prisma.feeStructure.deleteMany()
  await prisma.transaction.deleteMany()
  await prisma.tenantModule.deleteMany()
  
  await prisma.learningExplanation.deleteMany()
  await prisma.learningVideo.deleteMany()
  await prisma.learningPdf.deleteMany()
  await prisma.learningTopic.deleteMany()
  await prisma.learningChapter.deleteMany()
  await prisma.alertRecipient.deleteMany()
  await prisma.alert.deleteMany()
  await prisma.announcement.deleteMany()
  await prisma.activityLog.deleteMany()
  await prisma.studentRiskFlag.deleteMany()
  await prisma.parentStudent.deleteMany()
  await prisma.parent.deleteMany()
  await prisma.studentAcademicRecord.deleteMany()
  await prisma.studentEnrollment.deleteMany()
  await prisma.mark.deleteMany()
  await prisma.attendance.deleteMany()
  await prisma.teachingAssignment.deleteMany()
  await prisma.classTeacherAssignment.deleteMany()
  await prisma.student.deleteMany()
  await prisma.teacher.deleteMany()
  await prisma.subject.deleteMany()
  await prisma.class.deleteMany()
  await prisma.schoolSettings.deleteMany()
  await prisma.academicSession.deleteMany()
  await prisma.user.deleteMany()
  await prisma.school.deleteMany()

  console.log('  ✓ Database wiped clean.')

  const defaultPassword = await bcrypt.hash('password123', 10)

  // --------------------------------------------------------------------------
  // 2. CREATE SUPERADMIN
  // --------------------------------------------------------------------------
  console.log('\n[2/7] Provisioning Superadmin...')
  await prisma.user.create({
    data: {
      email: 'superadmin@schoolerp.com',
      password: defaultPassword,
      name: 'Superadmin System',
      role: 'SUPERADMIN',
      mustChangePassword: false,
    },
  })

  // --------------------------------------------------------------------------
  // 3. CREATE TWO SCHOOLS
  // --------------------------------------------------------------------------
  console.log('\n[3/7] Creating Schools...')
  const school1 = await prisma.school.create({
    data: {
      name: 'Delhi Public School',
      domain: 'dps',
      address: 'Mathura Road, New Delhi',
    },
  })
  const school2 = await prisma.school.create({
    data: {
      name: 'Kendriya Vidyalaya',
      domain: 'kv',
      address: 'JNU Campus, New Delhi',
    },
  })

  const schools = [school1, school2]

  // Enable all modules for both schools
  for (const s of schools) {
    for (const mod of ['LIBRARY', 'PAYROLL', 'TRANSPORT', 'FINANCE']) {
      await prisma.tenantModule.create({
        data: { schoolId: s.id, moduleKey: mod, isEnabled: true },
      })
    }
  }

  // --------------------------------------------------------------------------
  // 4. SEEDING EACH SCHOOL
  // --------------------------------------------------------------------------
  let studentCount = 1;
  let teacherCount = 1;
  let parentCount = 1;

  for (const school of schools) {
    const sName = school.domain
    console.log(`\n[4/7] Seeding data for ${school.name}...`)

    const activeSession = await prisma.academicSession.create({
      data: {
        schoolId: school.id,
        name: `2026-2027 (${sName})`,
        startDate: new Date('2026-04-01'),
        endDate: new Date('2027-03-31'),
        status: 'ACTIVE',
      },
    })

    await prisma.schoolSettings.create({
      data: {
        id: `default_${school.id}`,
        schoolName: school.name,
        schoolAddress: school.address || '',
        contactNumber: '+91 9876543210',
        principalName: sName === 'dps' ? 'Dr. Ramesh Kumar' : 'Mrs. Sunita Sharma',
        email: `contact@${sName}.edu.in`,
        activeSessionId: activeSession.id,
      },
    })

    // Create Admin
    await prisma.user.create({
      data: {
        schoolId: school.id,
        email: `admin@${sName}.edu.in`,
        password: defaultPassword,
        name: `Admin - ${school.name}`,
        role: 'ADMIN',
        mustChangePassword: false,
      },
    })

    // Create Librarian
    await prisma.user.create({
      data: {
        schoolId: school.id,
        email: `librarian@${sName}.edu.in`,
        password: defaultPassword,
        name: `Librarian - ${school.name}`,
        role: 'LIBRARIAN',
        mustChangePassword: false,
      },
    })


    
    // Create Teachers
    const teacherNames = sName === 'dps' 
      ? ['Amit Patel', 'Priya Singh']
      : ['Suresh Raina', 'Anjali Desai']
    
    const teachers = []
    for (const tName of teacherNames) {
      const user = await prisma.user.create({
        data: {
          schoolId: school.id,
          email: `teacher${teacherCount}@${sName}.edu.in`,
          password: defaultPassword,
          name: tName,
          role: 'TEACHER',
        }
      })
      const teacher = await prisma.teacher.create({ data: { userId: user.id } })
      teachers.push(teacher)
      teacherCount++
    }

    // Classes & Subjects
    const classNames = ['Class 9', 'Class 10']
    const classes = []
    for (let i = 0; i < classNames.length; i++) {
      const cls = await prisma.class.create({
        data: { schoolId: school.id, name: `${classNames[i]} (${sName})`, teacherId: teachers[i].id }
      })
      classes.push(cls)
    }

    const subjectData = [
      { name: `Mathematics (${sName})`, code: `MATH-${sName}` },
      { name: `Science (${sName})`, code: `SCI-${sName}` },
    ]
    const subjects = []
    for (const sub of subjectData) {
      const s = await prisma.subject.create({ data: { ...sub, teacherId: teachers[0].id } })
      subjects.push(s)
    }

    // Create Students
    const studentNames = sName === 'dps'
      ? ['Aarav Khan', 'Vivaan Sharma', 'Aditya Verma']
      : ['Rohan Joshi', 'Mira Rajput', 'Kabir Bedi']

    const students = []
    for (let i = 0; i < studentNames.length; i++) {
      const user = await prisma.user.create({
        data: {
          schoolId: school.id,
          email: `student${studentCount}@${sName}.edu.in`,
          password: defaultPassword,
          name: studentNames[i],
          role: 'STUDENT',
        }
      })
      const student = await prisma.student.create({
        data: { userId: user.id, classId: classes[i % 2].id, rollNumber: `ROLL-${studentCount}` }
      })
      
      await prisma.studentEnrollment.create({
        data: { studentId: student.id, classId: classes[i % 2].id, academicSessionId: activeSession.id }
      })
      students.push(student)
      studentCount++
    }

    // Parent
    const pUser = await prisma.user.create({
      data: {
        schoolId: school.id,
        email: `parent${parentCount}@${sName}.edu.in`,
        password: defaultPassword,
        name: `Rajeev (Parent of ${studentNames[0]})`,
        role: 'PARENT',
      }
    })
    const parent = await prisma.parent.create({ data: { userId: pUser.id } })
    await prisma.parentStudent.create({
      data: { parentId: parent.id, studentId: students[0].id, relationship: 'Father' }
    })
    parentCount++

    // Books
    const books = [
      { title: 'NCERT Mathematics Class 10', author: 'NCERT' },
      { title: 'Physics H.C. Verma', author: 'H.C. Verma' },
      { title: 'Panchatantra', author: 'Vishnu Sharma' },
    ]
    for (const b of books) {
      await prisma.book.create({
        data: { schoolId: school.id, title: b.title, author: b.author, totalCopies: 5, availableCopies: 5 }
      })
    }
  }

  console.log('\n==========================================================')
  console.log('  ✅ SEED COMPLETED SUCCESSFULLY - ALL DEMO DATA READY ')
  console.log('==========================================================')
  console.log('Credentials Summary (Password for all: password123):')
  console.log('\n--- GLOBAL ---')
  console.log('Superadmin: superadmin@schoolerp.com')
  
  console.log('\n--- Delhi Public School (DPS) ---')
  console.log('Admin:     admin@dps.edu.in')
  console.log('Librarian: librarian@dps.edu.in')
  console.log('Teacher:   teacher1@dps.edu.in (Amit Patel)')
  console.log('Student:   student1@dps.edu.in (Aarav Khan)')
  console.log('Parent:    parent1@dps.edu.in (Rajeev)')
  
  console.log('\n--- Kendriya Vidyalaya (KV) ---')
  console.log('Admin:     admin@kv.edu.in')
  console.log('Librarian: librarian@kv.edu.in')
  console.log('Teacher:   teacher6@kv.edu.in (Suresh Raina)')
  console.log('Student:   student11@kv.edu.in (Rohan Joshi)')
  console.log('Parent:    parent2@kv.edu.in (Rajeev)')
  console.log('==========================================================\n')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed with error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
