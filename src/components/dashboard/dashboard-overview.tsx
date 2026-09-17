import React from "react"
import { GraduationCap, Users, BookOpen, Activity, CheckCircle, Clock, LucideIcon } from "lucide-react"

interface OverviewStats {
  totalStudents: number
  totalTeachers: number
  totalClasses: number
  totalSubjects: number
  averagePerformance: string
  publishedMarksCount: number
  draftMarksCount: number
}

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: LucideIcon
}

function StatCard({ title, value, subtitle, icon: Icon }: StatCardProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col justify-between">
      <div className="flex items-center justify-between text-slate-500 mb-2">
        <span className="text-sm font-medium text-slate-500">{title}</span>
        <Icon className="h-4 w-4 text-slate-400" />
      </div>
      <div>
        <div className="text-2xl font-semibold text-slate-900 tracking-tight">{value}</div>
        {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
      </div>
    </div>
  )
}

export function DashboardOverview({ stats }: { stats: OverviewStats }) {
  return (
    <div className="space-y-6">
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

