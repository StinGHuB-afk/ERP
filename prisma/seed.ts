import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import bcrypt from 'bcryptjs'

const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL!,
  authToken: process.env.DATABASE_AUTH_TOKEN,
})

const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('==========================================================')
  console.log('  SCHOOL ERP - COMPLETE DATABASE RE-SEED PIPELINE         ')
  console.log('==========================================================\n')

  // --------------------------------------------------------------------------
  // 1. SAFE DELETION ORDER (Reverse dependency order to avoid FK errors)
  // --------------------------------------------------------------------------
  console.log('[1/7] Wiping existing data in reverse dependency order...')

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

  console.log('  ✓ Database wiped clean.')

  // Shared password hash (cost factor 10 for fast seeding)
  const defaultPassword = await bcrypt.hash('password123', 10)

  // --------------------------------------------------------------------------
  // 2. BASE CONFIGURATION: Academic Session & School Settings
  // --------------------------------------------------------------------------
  console.log('\n[2/7] Creating Active Academic Session & School Settings...')

  const activeSession = await prisma.academicSession.create({
    data: {
      name: '2026-2027',
      startDate: new Date('2026-06-01'),
      endDate: new Date('2027-05-31'),
      status: 'ACTIVE',
    },
  })

  await prisma.schoolSettings.create({
    data: {
      id: 'default',
      schoolName: 'EduManage International Academy',
      schoolAddress: '100 Knowledge Boulevard, Suite 500, Education City',
      contactNumber: '+1 800 555 0199',
      principalName: 'Dr. Eleanor Vance',
      email: 'contact@edumanage.org',
      activeSessionId: activeSession.id,
    },
  })

  console.log(`  ✓ Active Session created: ${activeSession.name} (${activeSession.id})`)

  // --------------------------------------------------------------------------
  // 3. SYSTEM ADMIN ACCOUNT
  // --------------------------------------------------------------------------
  console.log('\n[3/7] Provisioning System Administrator Account...')

  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@school.com',
      password: defaultPassword,
      name: 'System Administrator',
      role: 'ADMIN',
      mustChangePassword: false,
    },
  })

  console.log(`  ✓ Admin account created: ${adminUser.email}`)

  // --------------------------------------------------------------------------
  // 4. CREATING 10 FRESH TEACHERS
  // --------------------------------------------------------------------------
  console.log('\n[4/7] Creating 10 Teacher accounts...')

  const teacherUsersData = Array.from({ length: 10 }, (_, idx) => ({
    email: `teacher${idx + 1}@school.com`,
    password: defaultPassword,
    name: `Teacher ${idx + 1}`,
    role: 'TEACHER' as const,
    mustChangePassword: false,
  }))

  await prisma.user.createMany({ data: teacherUsersData })

  const createdTeacherUsers = await prisma.user.findMany({
    where: { role: 'TEACHER' },
    orderBy: { email: 'asc' },
  })

  await prisma.teacher.createMany({
    data: createdTeacherUsers.map((u) => ({ userId: u.id })),
  })

  const teachers = await prisma.teacher.findMany({
    include: { user: true },
    orderBy: { user: { email: 'asc' } },
  })

  console.log(`  ✓ Created 10 teachers (teacher1@school.com ... teacher10@school.com)`)

  // --------------------------------------------------------------------------
  // 5. CLASSES & CORE SUBJECTS
  // --------------------------------------------------------------------------
  console.log('\n[5/7] Creating 5 Classes & 6 Core Subjects...')

  const classNames = ['Grade 10-A', 'Grade 10-B', 'Grade 11-A', 'Grade 11-B', 'Grade 12-A']
  const classes = []

  for (let i = 0; i < classNames.length; i++) {
    const homeroomTeacher = teachers[i]
    const cls = await prisma.class.create({
      data: {
        name: classNames[i],
        teacherId: homeroomTeacher.id,
      },
    })

    await prisma.classTeacherAssignment.create({
      data: {
        teacherId: homeroomTeacher.id,
        classId: cls.id,
        academicSessionId: activeSession.id,
        isActive: true,
      },
    })

    classes.push(cls)
  }

  const subjectData = [
    { name: 'Mathematics', code: 'MATH101' },
    { name: 'Science', code: 'SCI101' },
    { name: 'English Literature', code: 'ENG101' },
    { name: 'History', code: 'HIST101' },
    { name: 'Physics', code: 'PHYS101' },
    { name: 'Chemistry', code: 'CHEM101' },
  ]

  await prisma.subject.createMany({ data: subjectData })
  const subjects = await prisma.subject.findMany({ orderBy: { code: 'asc' } })

  console.log(`  ✓ Created ${classes.length} classes and ${subjects.length} subjects.`)

  // Teaching Assignments
  const assignmentSpecs = [
    { teacherIndex: 0, subjectIndex: 0, classIndices: [0, 1] },
    { teacherIndex: 1, subjectIndex: 1, classIndices: [0, 1] },
    { teacherIndex: 2, subjectIndex: 2, classIndices: [0, 2] },
    { teacherIndex: 3, subjectIndex: 3, classIndices: [1, 3] },
    { teacherIndex: 4, subjectIndex: 4, classIndices: [2, 4] },
    { teacherIndex: 5, subjectIndex: 5, classIndices: [3, 4] },
    { teacherIndex: 6, subjectIndex: 0, classIndices: [2, 4] },
    { teacherIndex: 7, subjectIndex: 1, classIndices: [3, 4] },
    { teacherIndex: 8, subjectIndex: 2, classIndices: [3, 4] },
    { teacherIndex: 9, subjectIndex: 3, classIndices: [2, 4] },
  ]

  const teachingAssignmentData: Array<{ teacherId: string; subjectId: string; classId: string; academicSessionId: string; isActive: boolean }> = []
  for (const spec of assignmentSpecs) {
    const teacher = teachers[spec.teacherIndex]
    const subject = subjects[spec.subjectIndex]
    for (const clsIdx of spec.classIndices) {
      const cls = classes[clsIdx]
      teachingAssignmentData.push({
        teacherId: teacher.id,
        subjectId: subject.id,
        classId: cls.id,
        academicSessionId: activeSession.id,
        isActive: true,
      })
    }
  }

  await prisma.teachingAssignment.createMany({ data: teachingAssignmentData })
  console.log('  ✓ Active Teaching Assignments created.')

  // --------------------------------------------------------------------------
  // 6. CREATING 50 FRESH STUDENTS & ENROLLMENTS (Batched createMany)
  // --------------------------------------------------------------------------
  console.log('\n[6/7] Batch creating 50 Student accounts & Enrollments...')

  const studentUsersData = Array.from({ length: 50 }, (_, idx) => ({
    email: `student${idx + 1}@school.com`,
    password: defaultPassword,
    name: `Student ${idx + 1}`,
    role: 'STUDENT' as const,
    mustChangePassword: false,
  }))

  await prisma.user.createMany({ data: studentUsersData })

  const createdStudentUsers = await prisma.user.findMany({
    where: { role: 'STUDENT' },
    orderBy: { email: 'asc' },
  })

  // Map 10 students per class
  const studentDataList = createdStudentUsers.map((u, idx) => {
    const targetClass = classes[idx % 5]
    return {
      userId: u.id,
      classId: targetClass.id,
      rollNumber: `STU-${String(idx + 1).padStart(3, '0')}`,
    }
  })

  await prisma.student.createMany({ data: studentDataList })

  const createdStudents = await prisma.student.findMany({
    include: { user: true },
    orderBy: { rollNumber: 'asc' },
  })

  const enrollmentDataList = createdStudents.map((st) => ({
    studentId: st.id,
    classId: st.classId!,
    academicSessionId: activeSession.id,
    status: 'ACTIVE' as const,
  }))

  await prisma.studentEnrollment.createMany({ data: enrollmentDataList })
  console.log(`  ✓ Batch created 50 students & enrollments across 5 classes.`)

  // --------------------------------------------------------------------------
  // 6b. SEED HISTORICAL 60-DAY ATTENDANCE & MARKS DATA
  // --------------------------------------------------------------------------
  console.log('  Seeding 60-day historical attendance dataset & sample marks...')

  // Map class teacher lookup map for fast attendance attribution
  const classTeacherMap = new Map(classes.map((c) => [c.id, c.teacherId!]))

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const markDataList = []
  const attendanceBatch: Array<{
    studentId: string
    classId: string
    teacherId: string
    academicSessionId: string
    date: Date
    status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED'
    remarks?: string
  }> = []

  // Generate Marks for all students across subjects
  createdStudents.forEach((st, idx) => {
    const mathSubj = subjects[0]
    const scienceSubj = subjects[1]

    markDataList.push({
      studentId: st.id,
      subjectId: mathSubj.id,
      teacherId: teachers[0].id,
      academicSessionId: activeSession.id,
      examType: 'Midterm',
      score: 70 + (idx % 25),
      maxScore: 100,
      status: 'PUBLISHED' as const,
    })

    markDataList.push({
      studentId: st.id,
      subjectId: scienceSubj.id,
      teacherId: teachers[1].id,
      academicSessionId: activeSession.id,
      examType: 'Midterm',
      score: 65 + ((idx * 3) % 30),
      maxScore: 100,
      status: 'PUBLISHED' as const,
    })
  })

  // Generate 60-Day Weekday Attendance for all 50 Students
  createdStudents.forEach((st, studentIdx) => {
    const classTeacherId = classTeacherMap.get(st.classId!) || teachers[0].id

    for (let dayOffset = 0; dayOffset < 60; dayOffset++) {
      const attDate = new Date(today)
      attDate.setDate(today.getDate() - dayOffset)
      attDate.setHours(0, 0, 0, 0)

      const dayOfWeek = attDate.getDay()
      // Skip weekends (Saturday=6, Sunday=0)
      if (dayOfWeek === 0 || dayOfWeek === 6) continue

      let status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED' = 'PRESENT'
      let remarks: string | undefined = undefined

      // Specific Edge Cases
      if (studentIdx < 3) {
        // Poor Attendance Tier (<75%): Student 1, Student 2, Student 3
        const rand = (studentIdx * 17 + dayOffset * 13) % 100
        if (rand < 35) {
          status = 'ABSENT'
          remarks = 'Unexcused absence'
        } else if (rand < 40) {
          status = 'LATE'
          remarks = 'Arrived 20 mins late'
        } else {
          status = 'PRESENT'
        }
      } else if (studentIdx >= 3 && studentIdx < 6) {
        // Flawless Attendance Tier (100%): Student 4, Student 5, Student 6
        status = 'PRESENT'
      } else {
        // Standard Realistic Distribution: ~85% PRESENT, 10% ABSENT, 5% LATE
        const rand = (studentIdx * 7 + dayOffset * 11) % 100
        if (rand < 10) {
          status = 'ABSENT'
          remarks = 'Medical leave'
        } else if (rand < 15) {
          status = 'LATE'
        } else {
          status = 'PRESENT'
        }
      }

      attendanceBatch.push({
        studentId: st.id,
        classId: st.classId!,
        teacherId: classTeacherId,
        academicSessionId: activeSession.id,
        date: attDate,
        status,
        remarks,
      })
    }
  })

  await prisma.mark.createMany({ data: markDataList })
  await prisma.attendance.createMany({ data: attendanceBatch })

  console.log(`  ✓ Batch inserted ${markDataList.length} marks & ${attendanceBatch.length} historical attendance records.`)

  // --------------------------------------------------------------------------
  // 7. PARENT ACCOUNT
  // --------------------------------------------------------------------------
  console.log('\n[7/7] Provisioning Parent Account...')

  const parentUser = await prisma.user.create({
    data: {
      email: 'parent@school.com',
      password: defaultPassword,
      name: 'Robert Parent',
      role: 'PARENT',
      mustChangePassword: false,
    },
  })

  const parent = await prisma.parent.create({
    data: { userId: parentUser.id },
  })

  if (createdStudents.length >= 2) {
    await prisma.parentStudent.createMany({
      data: [
        {
          parentId: parent.id,
          studentId: createdStudents[0].id,
          relationship: 'Father',
          isPrimaryContact: true,
        },
        {
          parentId: parent.id,
          studentId: createdStudents[1].id,
          relationship: 'Father',
          isPrimaryContact: false,
        },
      ],
    })
  }

  console.log(`  ✓ Parent account created: ${parentUser.email}`)

  console.log('\n==========================================================')
  console.log('  ✅ SEED COMPLETED SUCCESSFULLY - ALL TEST ACCOUNTS READY ')
  console.log('==========================================================')
  console.log('Credentials Summary (Password for all: password123):')
  console.log('  - Admin:   admin@school.com')
  console.log('  - Teacher: teacher1@school.com ... teacher10@school.com')
  console.log('  - Student: student1@school.com ... student50@school.com')
  console.log('  - Parent:  parent@school.com\n')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed with error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
