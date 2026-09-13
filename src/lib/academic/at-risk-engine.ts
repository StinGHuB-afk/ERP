/**
 * Transparent, Rule-Based At-Risk Student Detection Engine
 * Standard Version: AT_RISK_RULE_V1.0
 * 
 * GUARANTEE: Pure computational scoring module operating in a READ-ONLY capacity.
 * Contains zero capability to mutate marks, attendance, or student records.
 */

export const AT_RISK_RULE_VERSION = "AT_RISK_RULE_V1.0";

export type RiskLevel = "HIGH" | "MODERATE" | "LOW";

export interface StudentAssessmentMetric {
  subjectId?: string;
  subjectName: string;
  examType: string;
  score: number;
  maxScore: number;
  percentage: number;
}

export interface StudentRiskInputMetrics {
  attendancePercentage: number;
  totalClassesHeld: number;
  attendedClasses: number;
  marks: StudentAssessmentMetric[];
}

export interface StudentRiskEvaluationResult {
  riskLevel: RiskLevel;
  riskScore: number;
  reasons: string[];
  ruleVersion: string;
  metricsSummary: {
    attendancePercentage: number;
    failedSubjectsCount: number;
    overallAveragePercentage: number;
  };
}

/**
 * Transparent Rule Engine Scoring Function
 * Evaluates risk level based on strict academic & attendance thresholds.
 */
export function evaluateStudentRisk(metrics: StudentRiskInputMetrics): StudentRiskEvaluationResult {
  let riskScore = 0;
  const reasons: string[] = [];

  // 1. Attendance Threshold Evaluation
  const attPct = Math.round(metrics.attendancePercentage * 10) / 10;
  
  if (attPct < 75) {
    riskScore += 40;
    reasons.push(`ATTENDANCE_CRITICAL: Attendance is ${attPct}% (Below 75% threshold)`);
  } else if (attPct < 85) {
    riskScore += 20;
    reasons.push(`ATTENDANCE_WARNING: Attendance is ${attPct}% (Below 85% warning threshold)`);
  }

  // 2. Assessment Performance Evaluation (<40% is a failing mark)
  const failedMarks = metrics.marks.filter(
    (m) => m.maxScore > 0 && m.score / m.maxScore < 0.4
  );

  if (failedMarks.length >= 2) {
    riskScore += 40;
    const failedList = failedMarks.map((m) => `${m.subjectName} (${m.examType})`).join(", ");
    reasons.push(`MULTIPLE_FAILING_GRADES: Failed ${failedMarks.length} assessments: ${failedList}`);
  } else if (failedMarks.length === 1) {
    riskScore += 20;
    const failedItem = failedMarks[0];
    reasons.push(`SINGLE_FAILING_GRADE: Failed assessment in ${failedItem.subjectName} (${failedItem.examType})`);
  }

  // 3. Overall Academic Average Evaluation
  const totalPercentage = metrics.marks.reduce((acc, curr) => acc + curr.percentage, 0);
  const overallAverage = metrics.marks.length > 0 ? Math.round((totalPercentage / metrics.marks.length) * 10) / 10 : 100;

  if (metrics.marks.length > 0 && overallAverage < 50) {
    riskScore += 20;
    reasons.push(`LOW_OVERALL_AVERAGE: Term mark average is ${overallAverage}% (Below 50% benchmark)`);
  }

  // 4. Final Risk Level Determination
  let riskLevel: RiskLevel = "LOW";
  if (riskScore >= 50) {
    riskLevel = "HIGH";
  } else if (riskScore >= 20) {
    riskLevel = "MODERATE";
  }

  return {
    riskLevel,
    riskScore,
    reasons,
    ruleVersion: AT_RISK_RULE_VERSION,
    metricsSummary: {
      attendancePercentage: attPct,
      failedSubjectsCount: failedMarks.length,
      overallAveragePercentage: overallAverage,
    },
  };
}
