import React from "react"
import { StatCard } from "./stat-card"
import { GraduationCap, Users, BookOpen, Activity, CheckCircle, Clock } from "lucide-react"

interface OverviewStats {
  totalStudents: number
  totalTeachers: number
  totalClasses: number
  totalSubjects: number
  averagePerformance: string
  publishedMarksCount: number
  draftMarksCount: number
}

interface DashboardOverviewProps {
  stats: OverviewStats
}

/**
 * Enterprise Dashboard Overview Container
 * - Flattened DOM structure (zero nested sub-cards or gray boxes)
 * - Typography-driven hierarchy with organic whitespace (gap-6)
 * - Pure white surfaces sitting directly on the slate-50 canvas
 */
export function DashboardOverview({ stats }: DashboardOverviewProps) {
  return (
    <div className="space-y-6">
      {/* Primary Key Metric Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Students"
          value={stats.totalStudents.toLocaleString()}
          subtitle="Active Enrolled Roster"
          icon={GraduationCap}
        />

        <StatCard
          title="Total Teachers"
          value={stats.totalTeachers.toLocaleString()}
          subtitle="Faculty & Instructors"
          icon={Users}
        />

        <StatCard
          title="Academic Entities"
          value={`${stats.totalClasses} Classes`}
          subtitle={`${stats.totalSubjects} Registered Subjects`}
          icon={BookOpen}
        />

        <StatCard
          title="School Avg Performance"
          value={`${stats.averagePerformance}%`}
          subtitle="Based on published term marks"
          icon={Activity}
        />
      </div>

      {/* Marks Pipeline Summary — Flattened White Card, No Sub-cards */}
      <div className="bg-white border border-slate-200 rounded-lg p-6">
        <h3 className="text-sm font-medium text-slate-500 mb-4">Marks Publishing Pipeline</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-1">
              <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
              <span>Published Marks</span>
            </div>
            <div className="text-2xl font-semibold text-slate-900">
              {stats.publishedMarksCount.toLocaleString()}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-1">
              <Clock className="h-3.5 w-3.5 text-amber-500" />
              <span>Pending Drafts</span>
            </div>
            <div className="text-2xl font-semibold text-slate-900">
              {stats.draftMarksCount.toLocaleString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
