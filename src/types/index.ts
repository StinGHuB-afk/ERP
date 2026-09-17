import { Prisma } from "@prisma/client"

/**
 * Session User Type derived directly from Prisma Payload
 */
export type SessionUserPayload = Prisma.UserGetPayload<{
  select: {
    id: true
    email: true
    name: true
    role: true
    mustChangePassword: true
    teacher: { select: { id: true } }
    student: { select: { id: true; classId: true } }
  }
}>

/**
 * Roster Student Payload
 */
export interface RosterStudent {
  enrollmentId: string
  studentId: string
  name: string
  email: string
  rollNumber: string | null
  classId: string
  className: string
  status: string
}

/**
 * Mark Record Payload
 */
export interface MarkData {
  id: string
  studentId: string
  subjectId: string
  examType: string
  score: number
  maxScore: number
  status: "DRAFT" | "PUBLISHED"
  student: { user: { name: string | null } }
  subject: { name: string }
}

/**
 * Risk Flag Item Payload
 */
export interface RiskFlagItem {
  id: string
  studentId: string
  classId: string
  academicSessionId: string
  riskLevel: "HIGH" | "MODERATE" | "LOW"
  riskScore: number
  reasons: string
  ruleVersion: string
  status: "PENDING" | "ACKNOWLEDGED" | "DISMISSED"
  reviewNote: string | null
  reviewedAt: Date | string | null
  createdAt: Date | string
  student: {
    rollNumber: string | null
    user: { name: string | null; email: string } | null
  }
  class: { name: string }
  reviewedBy: { name: string | null } | null
}

/**
 * At-Risk Engine Domain Metrics
 */
export type RiskLevel = "HIGH" | "MODERATE" | "LOW"

export interface StudentAssessmentMetric {
  subjectId?: string
  subjectName: string
  examType: string
  score: number
  maxScore: number
  percentage: number
}

export interface StudentRiskInputMetrics {
  attendancePercentage: number
  totalClassesHeld: number
  attendedClasses: number
  marks: StudentAssessmentMetric[]
}

export interface StudentRiskEvaluationResult {
  riskLevel: RiskLevel
  riskScore: number
  reasons: string[]
  ruleVersion: string
  metricsSummary: {
    attendancePercentage: number
    failedSubjectsCount: number
    overallAveragePercentage: number
  }
}

/**
 * Alert Target Payload
 */
export type AlertTargetPayload = {
  targetType: "GLOBAL" | "ALL_TEACHERS" | "ALL_STUDENTS" | "SPECIFIC_CLASSES" | "SPECIFIC_STUDENTS"
  classIds?: string[]
  studentIds?: string[]
}
