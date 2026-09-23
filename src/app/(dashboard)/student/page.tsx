import prisma from "@/lib/prisma"
import { verifySession } from "@/lib/auth/session"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { FileText, Percent, Award, TrendingUp, CalendarDays, Heart, Bus, Stethoscope, Phone, MapPin, Clock } from "lucide-react"
import Link from "next/link"
import { Progress } from "@/components/ui/progress"
import { StudentCharts } from "@/components/dashboard/student-charts"
import { RecentNotices } from "@/components/dashboard/recent-notices"
import { ProfileUpdateForm } from "@/components/forms/ProfileUpdateForm"
import { StudentTransportRequestForm } from "@/components/forms/StudentTransportRequestForm"

function calculateGrade(percentage: number): string {
  if (percentage >= 90) return "A+"
  if (percentage >= 80) return "A"
  if (percentage >= 70) return "B"
  if (percentage >= 60) return "C"
  if (percentage >= 50) return "D"
  return "F"
}

export default async function StudentDashboard() {
  const session = await verifySession()
  const settings = await prisma.schoolSettings.findUnique({ where: { id: "default" } })
  const activeSessionId = settings?.activeSessionId || "none"

  const studentUser = await prisma.user.findUnique({
    where: { id: session?.userId },
    include: { 
      student: { 
        include: { 
          class: true,
          attendance: {
            where: { academicSessionId: activeSessionId }
          },
          healthRecord: {
            include: {
              clinicVisits: {
                orderBy: { visitDate: 'desc' },
                take: 4
              }
            }
          },
          transportAssignment: true,
          transportChangeRequests: {
            orderBy: { createdAt: 'desc' },
            take: 3
          }
        } 
      } 
    }
  })
  
  if (!studentUser?.student) return <div className="p-8 text-center text-slate-500 font-medium">Unauthorized Access</div>

  const student = studentUser.student
  const health = student.healthRecord
  const transport = student.transportAssignment
  const transportRequests = student.transportChangeRequests

  const marks = await prisma.mark.findMany({
    where: { 
      studentId: student.id,
      status: "PUBLISHED",
      academicSessionId: activeSessionId
    },
    include: { subject: true },
    orderBy: { updatedAt: 'desc' }
  })

  const totalScore = marks.reduce((sum, mark) => sum + (mark.score ?? 0), 0)
  const maxPossible = marks.reduce((sum, mark) => sum + mark.maxScore, 0)
  const percentageStr = maxPossible > 0 ? ((totalScore / maxPossible) * 100).toFixed(1) : "0.0"
  const percentage = parseFloat(percentageStr)
  const grade = maxPossible > 0 ? calculateGrade(percentage) : "N/A"

  const recentMarks = marks.slice(0, 4)

  const marksData = marks.map(m => ({
    subject: m.subject.name,
    score: m.score ?? 0,
    maxScore: m.maxScore,
    percentage: Number((((m.score ?? 0) / m.maxScore) * 100).toFixed(1))
  }))

  // Attendance logic
  const attendance = student.attendance
  const totalDays = attendance.length
  const presentDays = attendance.filter(a => a.status === "PRESENT").length
  const attendancePercentage = totalDays > 0 ? ((presentDays / totalDays) * 100).toFixed(1) : "N/A font-medium"

  return (
    <div className="space-y-8 pb-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Student Portal Dashboard</h1>
          <p className="text-sm text-slate-500">Welcome back, {studentUser.name}. Class: {student.class?.name || "Unassigned"}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <ProfileUpdateForm
            studentId={student.id}
            currentName={student.emergencyContactName || ""}
            currentPhone={student.emergencyContactPhone || ""}
            currentRelation={student.emergencyContactRelation || ""}
          />
          <Link href="/student/results" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium text-sm transition-colors shadow-sm inline-flex items-center gap-2">
            <FileText className="w-4 h-4" />
            View Full Marksheet
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="shadow-sm border-slate-200 bg-gradient-to-br from-indigo-50 to-blue-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-indigo-900">Overall Performance</CardTitle>
            <div className="h-8 w-8 bg-indigo-200 rounded-full flex items-center justify-center">
              <Percent className="h-4 w-4 text-indigo-700" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-indigo-900">{percentageStr}%</div>
            <p className="text-xs text-indigo-700 mt-1">Cumulative average</p>
          </CardContent>
        </Card>
        
        <Card className="shadow-sm border-slate-200 bg-gradient-to-br from-purple-50 to-pink-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-900">Current Grade</CardTitle>
            <div className="h-8 w-8 bg-purple-200 rounded-full flex items-center justify-center">
              <Award className="h-4 w-4 text-purple-700" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-900">{grade}</div>
            <p className="text-xs text-purple-700 mt-1">Based on {percentageStr}%</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Attendance Rate</CardTitle>
            <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
              <CalendarDays className="h-4 w-4 text-green-700" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{attendancePercentage}%</div>
            <p className="text-xs text-slate-500 mt-1">{presentDays} / {totalDays} days present</p>
          </CardContent>
        </Card>
      </div>
    
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 grid gap-6 md:grid-cols-2">
          {marksData.length > 0 ? (
            <StudentCharts marksData={marksData} />
          ) : (
            <Card className="shadow-sm border-slate-200 flex items-center justify-center min-h-[300px]">
              <div className="text-center text-slate-500">
                <TrendingUp className="h-10 w-10 mx-auto mb-2 text-slate-300" />
                <p>No performance data available yet.</p>
              </div>
            </Card>
          )}

          <Card className="shadow-sm border-slate-200">
            <CardHeader>
              <CardTitle className="text-base font-semibold text-slate-800">Recent Results</CardTitle>
              <CardDescription>Your latest subject scores</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {recentMarks.length === 0 ? (
                <div className="text-center text-slate-500 py-8">
                  No recent results.
                </div>
              ) : (
                recentMarks.map(mark => {
                  const markScore = mark.score ?? 0
                  const markPercentage = (markScore / mark.maxScore) * 100;
                  let colorClass = "bg-blue-600";
                  if (markPercentage >= 80) colorClass = "bg-green-500";
                  else if (markPercentage < 50) colorClass = "bg-red-500";

                  return (
                    <div key={mark.id} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-slate-700">{mark.subject.name}</span>
                        <span className="text-slate-500 font-medium">{markScore} / {mark.maxScore}</span>
                      </div>
                      <Progress value={markPercentage} indicatorColor={colorClass} className="h-2" />
                    </div>
                  )
                })
              )}
              {recentMarks.length > 0 && (
                <div className="pt-2 text-center">
                  <Link href="/student/results" className="text-sm text-blue-600 hover:underline">
                    View all results
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <RecentNotices role="STUDENT" />
        </div>
      </div>

      {/* Enterprise Sections: Health Record & Transport Details */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Health Record Card */}
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
                <Heart className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold text-slate-900">My Health Record</CardTitle>
                <CardDescription className="text-xs text-slate-500">Medical overview & clinic visit logs</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4 space-y-4 text-xs">
            {health ? (
              <>
                <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <div>
                    <span className="text-slate-400 font-medium block">Blood Group</span>
                    <span className="font-bold text-slate-800 text-sm">{health.bloodGroup || "Not recorded"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block">Emergency Protocol</span>
                    <span className="font-semibold text-slate-800">{health.emergencyMedicalProtocol || "Standard school protocol"}</span>
                  </div>
                </div>

                <div>
                  <span className="font-semibold text-slate-700 block mb-1">Allergies & Sensitivities</span>
                  <p className="text-slate-600 bg-rose-50/50 text-rose-900 p-2.5 rounded-md border border-rose-100">
                    {health.allergies || "No documented allergies."}
                  </p>
                </div>

                <div>
                  <span className="font-semibold text-slate-700 block mb-1">Daily Medications</span>
                  <p className="text-slate-600 bg-slate-50 p-2.5 rounded-md border border-slate-100">
                    {health.dailyMedications || "No daily medications."}
                  </p>
                </div>

                <div>
                  <span className="font-semibold text-slate-700 block mb-2">Recent School Clinic Visits</span>
                  {health.clinicVisits.length === 0 ? (
                    <p className="text-slate-400 italic">No clinic visits logged.</p>
                  ) : (
                    <div className="space-y-2">
                      {health.clinicVisits.map((visit) => (
                        <div key={visit.id} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex flex-col gap-1">
                          <div className="flex items-center justify-between text-slate-700 font-medium">
                            <span className="flex items-center gap-1.5 text-blue-700">
                              <Stethoscope className="h-3.5 w-3.5" />
                              {visit.reason}
                            </span>
                            <span className="text-[11px] text-slate-400" suppressHydrationWarning>
                              {new Date(visit.visitDate).toLocaleDateString()}
                            </span>
                          </div>
                          {visit.treatmentGiven && (
                            <p className="text-slate-600 text-[11px]">Treatment: {visit.treatmentGiven}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center py-6 text-slate-400">
                <Heart className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                <p>No medical record profile on file.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Transport Card */}
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <Bus className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold text-slate-900">Transport & Bus Route</CardTitle>
                <CardDescription className="text-xs text-slate-500">Active transport assignment & requests</CardDescription>
              </div>
            </div>
            <StudentTransportRequestForm
              studentId={student.id}
              currentRouteName={transport?.routeName}
            />
          </CardHeader>
          <CardContent className="pt-4 space-y-4 text-xs">
            {transport ? (
              <div className="bg-blue-50/50 p-3.5 rounded-lg border border-blue-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-blue-950">{transport.routeName}</span>
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-[11px] font-semibold">
                    {transport.busNumber || "Bus N/A"}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-slate-600 pt-1">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-slate-400" />
                    <span>Pickup: <strong className="text-slate-800">{transport.pickupPoint || "N/A"}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-slate-400" />
                    <span>Drop: <strong className="text-slate-800">{transport.dropPoint || "N/A"}</strong></span>
                  </div>
                </div>
                {(transport.pickupTime || transport.dropTime) && (
                  <div className="flex items-center gap-1.5 text-slate-600 pt-1 border-t border-blue-100">
                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                    <span>Schedule: <strong className="text-slate-800">{transport.pickupTime || "N/A"} - {transport.dropTime || "N/A"}</strong></span>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-slate-500 text-center">
                No active transport bus assignment.
              </div>
            )}

            <div>
              <span className="font-semibold text-slate-700 block mb-2">Route Change Requests</span>
              {transportRequests.length === 0 ? (
                <p className="text-slate-400 italic">No recent route change requests.</p>
              ) : (
                <div className="space-y-2">
                  {transportRequests.map((req) => (
                    <div key={req.id} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-slate-800 block">{req.requestedRouteName}</span>
                        <span className="text-[11px] text-slate-400 block" suppressHydrationWarning>
                          Submitted on {new Date(req.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        req.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                        req.status === 'REJECTED' ? 'bg-rose-100 text-rose-800' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {req.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
