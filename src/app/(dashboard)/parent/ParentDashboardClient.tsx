"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { getChildAttendance, getChildResults } from "@/app/actions/parent"
import {
  Users,
  UserCheck,
  Award,
  Calendar,
  ShieldCheck,
  BookOpen,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  FileText,
} from "lucide-react"

interface LinkedChild {
  studentId: string
  name: string
  email: string
  rollNumber: string
  className: string
  relationship: string
  isPrimaryContact: boolean
}

interface ParentDashboardClientProps {
  childrenList: LinkedChild[]
}

export default function ParentDashboardClient({ childrenList }: ParentDashboardClientProps) {
  const [selectedChild, setSelectedChild] = useState<LinkedChild | null>(
    childrenList.length > 0 ? childrenList[0] : null
  )
  const [attendanceData, setAttendanceData] = useState<any>(null)
  const [resultsData, setResultsData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<"ATTENDANCE" | "RESULTS">("ATTENDANCE")

  useEffect(() => {
    if (!selectedChild) return

    async function loadChildData() {
      setIsLoading(true)
      const [attRes, marksRes] = await Promise.all([
        getChildAttendance(selectedChild!.studentId),
        getChildResults(selectedChild!.studentId),
      ])

      if (attRes.success) setAttendanceData(attRes)
      if (marksRes.success) setResultsData(marksRes)
      setIsLoading(false)
    }

    loadChildData()
  }, [selectedChild])

  if (childrenList.length === 0) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center shadow-xl">
          <Users className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-slate-200 mb-2">No Linked Students</h2>
          <p className="text-slate-400 text-sm">
            Your parent account is currently not linked to any active student records. Please contact the school administration.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 text-slate-100">
      {/* Header & Child Switcher */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded-full border border-blue-500/20">
              Family Portal Access
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mt-1">
              Parent Dashboard
            </h1>
            <p className="text-slate-400 text-sm">
              Secure, real-time academic & attendance overview for your registered children.
            </p>
          </div>

          {/* Child Switcher Dropdown / Buttons */}
          {childrenList.length > 1 && (
            <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
              <Users className="w-4 h-4 text-slate-400 ml-2" />
              <div className="flex gap-1">
                {childrenList.map((child) => (
                  <button
                    key={child.studentId}
                    onClick={() => setSelectedChild(child)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      selectedChild?.studentId === child.studentId
                        ? "bg-blue-600 text-white shadow-md"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                    }`}
                  >
                    {child.name} ({child.className})
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Selected Child Info Header */}
      {selectedChild && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center font-bold text-blue-400 text-lg">
              {selectedChild.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-100">{selectedChild.name}</h2>
                <span className="text-xs font-semibold text-blue-400 bg-blue-950 px-2 py-0.5 rounded border border-blue-800">
                  {selectedChild.relationship}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Class: <span className="font-semibold text-slate-200">{selectedChild.className}</span> | Roll Number:{" "}
                <span className="font-semibold text-slate-200">{selectedChild.rollNumber}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
              Verified Family Link
            </span>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-800">
        <button
          onClick={() => setActiveTab("ATTENDANCE")}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "ATTENDANCE"
              ? "border-blue-500 text-blue-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Calendar className="w-4 h-4" />
          Attendance Ledger
        </button>

        <button
          onClick={() => setActiveTab("RESULTS")}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "RESULTS"
              ? "border-blue-500 text-blue-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Award className="w-4 h-4" />
          Published Results & Report Cards
        </button>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-slate-400 text-sm animate-pulse">
          Loading verified academic data...
        </div>
      ) : activeTab === "ATTENDANCE" ? (
        /* Attendance View */
        <div className="space-y-6">
          {attendanceData?.summary && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="text-xs text-slate-400 font-medium">Overall Attendance</div>
                <div className="text-2xl font-bold text-blue-400 mt-1">
                  {attendanceData.summary.attendancePercentage}%
                </div>
              </div>

              <div className="bg-slate-900 border border-emerald-500/20 rounded-xl p-4">
                <div className="text-xs text-emerald-400 font-medium flex items-center justify-between">
                  <span>Present</span>
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl font-bold text-emerald-400 mt-1">
                  {attendanceData.summary.presentDays} Days
                </div>
              </div>

              <div className="bg-slate-900 border border-amber-500/20 rounded-xl p-4">
                <div className="text-xs text-amber-400 font-medium flex items-center justify-between">
                  <span>Late</span>
                  <Clock className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-2xl font-bold text-amber-400 mt-1">
                  {attendanceData.summary.lateDays} Days
                </div>
              </div>

              <div className="bg-slate-900 border border-red-500/20 rounded-xl p-4">
                <div className="text-xs text-red-400 font-medium flex items-center justify-between">
                  <span>Absent</span>
                  <XCircle className="w-4 h-4 text-red-400" />
                </div>
                <div className="text-2xl font-bold text-red-400 mt-1">
                  {attendanceData.summary.absentDays} Days
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 col-span-2 sm:col-span-1">
                <div className="text-xs text-slate-400 font-medium flex items-center justify-between">
                  <span>Excused Leave</span>
                  <AlertCircle className="w-4 h-4 text-slate-400" />
                </div>
                <div className="text-2xl font-bold text-slate-300 mt-1">
                  {attendanceData.summary.excusedDays} Days
                </div>
              </div>
            </div>
          )}

          {/* Attendance History Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
            <div className="p-4 border-b border-slate-800 font-semibold text-slate-200 text-sm flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-400" />
              Daily Attendance History
            </div>

            {attendanceData?.records?.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">
                No attendance records logged for the current active session yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 uppercase font-semibold">
                    <tr>
                      <th className="p-3">Date</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {attendanceData?.records?.map((record: any) => (
                      <tr key={record.id} className="hover:bg-slate-850">
                        <td className="p-3 font-mono">
                          {new Date(record.date).toLocaleDateString("en-US", {
                            weekday: "short",
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                              record.status === "PRESENT"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : record.status === "LATE"
                                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                : record.status === "ABSENT"
                                ? "bg-red-500/10 text-red-400 border border-red-500/20"
                                : "bg-slate-800 text-slate-400"
                            }`}
                          >
                            {record.status}
                          </span>
                        </td>
                        <td className="p-3 text-slate-400">{record.remarks || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Results View */
        <div className="space-y-6">
          {/* Report Card Verification Seal Banner */}
          {resultsData?.academicRecord && (
            <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-5 shadow-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                    Official Term Report Card ({resultsData.academicRecord.status})
                  </span>
                </div>
                <div className="text-xl font-bold text-white">
                  Overall Grade:{" "}
                  <span className="text-emerald-400">
                    {resultsData.academicRecord.finalGrade || "PASSED"}
                  </span>
                  {resultsData.academicRecord.finalPercentage && (
                    <span className="text-slate-400 text-sm font-normal ml-2">
                      ({resultsData.academicRecord.finalPercentage}%)
                    </span>
                  )}
                </div>
              </div>

              {resultsData.academicRecord.verificationCode && (
                <Link
                  href={`/verify/${resultsData.academicRecord.verificationCode}`}
                  target="_blank"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 shadow-md"
                >
                  <ShieldCheck className="w-4 h-4" />
                  View Public QR Verification
                </Link>
              )}
            </div>
          )}

          {/* Published Subject Marks List */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
            <div className="p-4 border-b border-slate-800 font-semibold text-slate-200 text-sm flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-400" />
              Published Term Assessments
            </div>

            {resultsData?.marks?.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">
                No published marks available for the current term yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 uppercase font-semibold">
                    <tr>
                      <th className="p-3">Subject</th>
                      <th className="p-3">Code</th>
                      <th className="p-3">Exam Type</th>
                      <th className="p-3">Score</th>
                      <th className="p-3">Percentage</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {resultsData?.marks?.map((mark: any) => (
                      <tr key={mark.id} className="hover:bg-slate-850">
                        <td className="p-3 font-semibold text-slate-100">{mark.subjectName}</td>
                        <td className="p-3 font-mono text-slate-400">{mark.subjectCode}</td>
                        <td className="p-3">{mark.examType}</td>
                        <td className="p-3 font-mono font-bold">
                          {mark.score} / {mark.maxScore}
                        </td>
                        <td className="p-3">
                          <span
                            className={`font-semibold px-2 py-0.5 rounded text-[11px] ${
                              mark.percentage >= 75
                                ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                                : mark.percentage >= 40
                                ? "bg-blue-950 text-blue-300 border border-blue-800"
                                : "bg-red-950 text-red-300 border border-red-800"
                            }`}
                          >
                            {mark.percentage}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
