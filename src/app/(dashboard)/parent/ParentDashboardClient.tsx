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
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-xl p-6 text-center shadow-sm">
          <Users className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">No Linked Students</h2>
          <p className="text-slate-500 text-sm">
            Your parent account is currently not linked to any active student records. Please contact the school administration.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 text-slate-900">
      {/* Header & Child Switcher */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200">
              Family Portal Access
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mt-2">
              Parent Dashboard
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">
              Secure, real-time academic & attendance overview for your registered children.
            </p>
          </div>

          {/* Child Switcher Buttons */}
          {childrenList.length > 1 && (
            <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-lg border border-slate-200">
              <Users className="w-4 h-4 text-slate-500 ml-2" />
              <div className="flex gap-1">
                {childrenList.map((child) => (
                  <button
                    key={child.studentId}
                    onClick={() => setSelectedChild(child)}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer active:scale-[0.98] ${
                      selectedChild?.studentId === child.studentId
                        ? "bg-blue-600 text-white shadow-sm"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
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
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center font-bold text-blue-700 text-lg">
              {selectedChild.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">{selectedChild.name}</h2>
                <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  {selectedChild.relationship}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Class: <span className="font-semibold text-slate-900">{selectedChild.className}</span> | Roll Number:{" "}
                <span className="font-semibold font-mono text-slate-900">{selectedChild.rollNumber}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 font-medium flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
              Verified Family Link
            </span>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab("ATTENDANCE")}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === "ATTENDANCE"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          <Calendar className="w-4 h-4" />
          Attendance Ledger
        </button>

        <button
          onClick={() => setActiveTab("RESULTS")}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === "RESULTS"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          <Award className="w-4 h-4" />
          Published Results & Report Cards
        </button>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-slate-500 text-sm animate-pulse bg-white border border-slate-200 rounded-xl">
          Loading verified academic data...
        </div>
      ) : activeTab === "ATTENDANCE" ? (
        /* Attendance View */
        <div className="space-y-6">
          {attendanceData?.summary && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                <div className="text-xs text-slate-500 font-medium">Overall Attendance</div>
                <div className="text-2xl font-bold font-mono text-blue-600 mt-1">
                  {attendanceData.summary.attendancePercentage}%
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                <div className="text-xs text-emerald-700 font-medium flex items-center justify-between">
                  <span>Present</span>
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-2xl font-bold font-mono text-emerald-600 mt-1">
                  {attendanceData.summary.presentDays} Days
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                <div className="text-xs text-amber-700 font-medium flex items-center justify-between">
                  <span>Late</span>
                  <Clock className="w-4 h-4 text-amber-600" />
                </div>
                <div className="text-2xl font-bold font-mono text-amber-600 mt-1">
                  {attendanceData.summary.lateDays} Days
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                <div className="text-xs text-rose-700 font-medium flex items-center justify-between">
                  <span>Absent</span>
                  <XCircle className="w-4 h-4 text-rose-600" />
                </div>
                <div className="text-2xl font-bold font-mono text-rose-600 mt-1">
                  {attendanceData.summary.absentDays} Days
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm col-span-2 sm:col-span-1">
                <div className="text-xs text-slate-500 font-medium flex items-center justify-between">
                  <span>Excused Leave</span>
                  <AlertCircle className="w-4 h-4 text-slate-400" />
                </div>
                <div className="text-2xl font-bold font-mono text-slate-800 mt-1">
                  {attendanceData.summary.excusedDays} Days
                </div>
              </div>
            </div>
          )}

          {/* Attendance History Table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-100 bg-slate-50 font-semibold text-slate-900 text-sm flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              Daily Attendance History
            </div>

            {attendanceData?.records?.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">
                No attendance records logged for the current active session yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200 text-[11px]">
                    <tr>
                      <th className="p-3">Date</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-800">
                    {attendanceData?.records?.map((record: any) => (
                      <tr key={record.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="p-3 font-mono font-medium">
                          {new Date(record.date).toLocaleDateString("en-US", {
                            weekday: "short",
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2.5 py-0.5 rounded text-[11px] font-semibold border ${
                              record.status === "PRESENT"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : record.status === "LATE"
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : record.status === "ABSENT"
                                ? "bg-rose-50 text-rose-700 border-rose-200"
                                : "bg-slate-100 text-slate-600 border-slate-200"
                            }`}
                          >
                            {record.status}
                          </span>
                        </td>
                        <td className="p-3 text-slate-500">{record.remarks || "—"}</td>
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
            <div className="bg-white border border-emerald-200 rounded-xl p-5 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                    Official Term Report Card ({resultsData.academicRecord.status})
                  </span>
                </div>
                <div className="text-xl font-bold text-slate-900">
                  Overall Grade:{" "}
                  <span className="text-emerald-600">
                    {resultsData.academicRecord.finalGrade || "PASSED"}
                  </span>
                  {resultsData.academicRecord.finalPercentage && (
                    <span className="text-slate-500 text-sm font-normal ml-2">
                      ({resultsData.academicRecord.finalPercentage}%)
                    </span>
                  )}
                </div>
              </div>

              {resultsData.academicRecord.verificationCode && (
                <Link
                  href={`/verify/${resultsData.academicRecord.verificationCode}`}
                  target="_blank"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-all flex items-center gap-1.5 shadow-sm active:scale-[0.98]"
                >
                  <ShieldCheck className="w-4 h-4" />
                  View Public QR Verification
                </Link>
              )}
            </div>
          )}

          {/* Published Subject Marks List */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-100 bg-slate-50 font-semibold text-slate-900 text-sm flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-600" />
              Published Term Assessments
            </div>

            {resultsData?.marks?.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">
                No published marks available for the current term yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200 text-[11px]">
                    <tr>
                      <th className="p-3">Subject</th>
                      <th className="p-3">Code</th>
                      <th className="p-3">Exam Type</th>
                      <th className="p-3">Score</th>
                      <th className="p-3">Percentage</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-800">
                    {resultsData?.marks?.map((mark: any) => (
                      <tr key={mark.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="p-3 font-semibold text-slate-900">{mark.subjectName}</td>
                        <td className="p-3 font-mono text-slate-500">{mark.subjectCode}</td>
                        <td className="p-3 text-slate-700">{mark.examType}</td>
                        <td className="p-3 font-mono font-bold text-slate-900">
                          {mark.score} / {mark.maxScore}
                        </td>
                        <td className="p-3">
                          <span
                            className={`font-semibold px-2 py-0.5 rounded text-[11px] border ${
                              mark.percentage >= 75
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : mark.percentage >= 40
                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                : "bg-rose-50 text-rose-700 border-rose-200"
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
