import { getStudent360Profile } from "@/app/actions/enterprise"
import { notFound, redirect } from "next/navigation"
import { verifySession } from "@/lib/auth/session"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { LogClinicVisitForm } from "@/components/forms/LogClinicVisitForm"
import {
  ArrowLeft,
  User,
  GraduationCap,
  Bus,
  HeartPulse,
  Clock,
  ShieldAlert,
  Phone,
  AlertTriangle,
  FileText,
  Activity,
  CheckCircle2,
  Calendar,
  Stethoscope,
} from "lucide-react"

export default async function Student360ProfilePage(
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params
  const session = await verifySession()
  if (!session || (session.role !== "ADMIN" && session.role !== "TEACHER")) {
    redirect("/login")
  }

  const res = await getStudent360Profile(params.id)
  if (!res.success || !res.data) {
    notFound()
  }

  const student = res.data
  const user = student.user
  const healthRecord = student.healthRecord
  const clinicVisits = healthRecord?.clinicVisits || []
  const transportAssignment = student.transportAssignment
  const transportRequests = student.transportChangeRequests || []
  const timelineEvents = student.timelineEvents || []

  // Helper for timeline event badge colors
  function getEventTypeBadge(type: string) {
    switch (type) {
      case "ACADEMIC":
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Academic</Badge>
      case "DISCIPLINARY":
        return <Badge className="bg-rose-100 text-rose-800 border-rose-200">Disciplinary</Badge>
      case "ATTENDANCE":
        return <Badge className="bg-purple-100 text-purple-800 border-purple-200">Attendance</Badge>
      case "HEALTH":
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Health</Badge>
      case "BEHAVIORAL":
        return <Badge className="bg-amber-100 text-amber-800 border-amber-200">Behavioral</Badge>
      case "MILESTONE":
        return <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200">Milestone</Badge>
      default:
        return <Badge className="bg-slate-100 text-slate-800 border-slate-200">General</Badge>
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header & Navigation */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/students"
            className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              360° Student Profile
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Comprehensive student record across academics, transport, health, and chronological events.
            </p>
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex items-center gap-3">
          <LogClinicVisitForm
            studentId={student.id}
            studentName={user.name || "Student"}
            triggerText="Log Clinic Visit"
          />
        </div>
      </div>

      {/* Hero Overview Card */}
      <Card className="shadow-sm border-slate-200 bg-white overflow-hidden">
        <div className="bg-slate-900 text-white p-6 sm:p-8 relative">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
            <div className="flex items-center gap-5">
              <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-black text-3xl flex items-center justify-center shadow-lg border-2 border-white/20">
                {user.name ? user.name.charAt(0).toUpperCase() : "S"}
              </div>
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="text-2xl font-black text-white">{user.name || "Student"}</h2>
                  <Badge className="bg-emerald-500 text-white font-semibold">
                    {student.status}
                  </Badge>
                  {student.behavioralFlags && (
                    <Badge variant="outline" className="bg-amber-500/20 text-amber-300 border-amber-400/40 gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      {student.behavioralFlags}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-300 mt-2 flex-wrap font-medium">
                  <div>Class: <span className="text-white font-bold">{student.class?.name || "Unassigned"}</span></div>
                  <div>Roll #: <span className="text-white font-bold">{student.rollNumber || "N/A"}</span></div>
                  <div>Email: <span className="text-white font-bold">{user.email}</span></div>
                </div>
              </div>
            </div>

            {/* Quick Emergency Banner */}
            {student.emergencyContactPhone && (
              <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/10 text-xs min-w-[240px]">
                <div className="text-[11px] font-semibold uppercase text-slate-400 tracking-wider mb-1 flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-rose-400" />
                  Emergency Contact
                </div>
                <div className="font-bold text-white text-sm">{student.emergencyContactName || "Primary Contact"}</div>
                <div className="text-slate-200 mt-0.5">{student.emergencyContactPhone} ({student.emergencyContactRelation || "Guardian"})</div>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Main Grid Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Columns: Detailed Modules */}
        <div className="lg:col-span-2 space-y-6">

          {/* Module 1: Personal & Academic Overview */}
          <Card className="shadow-sm border-slate-200 bg-white">
            <CardHeader className="border-b border-slate-100 pb-3">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-blue-600" />
                Academic Profile & Enrollment
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-5 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <span className="text-slate-400 font-semibold block uppercase text-[10px]">Homeroom Class</span>
                  <span className="text-slate-900 font-bold text-sm">{student.class?.name || "Unassigned"}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block uppercase text-[10px]">Roll Number</span>
                  <span className="text-slate-800 font-bold text-sm">{student.rollNumber || "N/A"}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block uppercase text-[10px]">Enrollment Status</span>
                  <span className="text-emerald-700 font-bold text-sm">{student.status}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block uppercase text-[10px]">Account Created</span>
                  <span className="text-slate-800 font-bold text-sm" suppressHydrationWarning>
                    {new Date(user.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Academic Performance & Marks Grid */}
              <div className="border-t border-slate-100 pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-blue-600" />
                    Recent Subject Marks & Assessments ({(student.marks || []).length})
                  </h4>
                  {student.academicRecords && student.academicRecords.length > 0 && (
                    <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">
                      Session Overall: {student.academicRecords[0].finalPercentage !== null ? `${student.academicRecords[0].finalPercentage?.toFixed(1)}% (${student.academicRecords[0].finalGrade || "N/A"})` : "In Progress"}
                    </Badge>
                  )}
                </div>

                {(!student.marks || student.marks.length === 0) ? (
                  <div className="text-center py-6 text-slate-400 text-xs border border-dashed rounded-lg bg-slate-50/50">
                    No academic marks recorded for this student yet.
                  </div>
                ) : (
                  <div className="rounded-lg border border-slate-200 overflow-hidden">
                    <Table>
                      <TableHeader className="bg-slate-50">
                        <TableRow>
                          <TableHead className="text-[11px] font-bold py-2">Subject</TableHead>
                          <TableHead className="text-[11px] font-bold py-2">Exam Type</TableHead>
                          <TableHead className="text-[11px] font-bold py-2 text-center">Score / Max</TableHead>
                          <TableHead className="text-[11px] font-bold py-2 text-center">Percentage</TableHead>
                          <TableHead className="text-[11px] font-bold py-2 text-right">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(student.marks || []).map((mark) => {
                          const pct = mark.score !== null ? ((mark.score / mark.maxScore) * 100).toFixed(1) : "N/A"
                          return (
                            <TableRow key={mark.id} className="hover:bg-slate-50/50">
                              <TableCell className="py-2.5 font-bold text-slate-900">{mark.subject.name} ({mark.subject.code})</TableCell>
                              <TableCell className="py-2.5 text-slate-600 font-medium">{mark.examType}</TableCell>
                              <TableCell className="py-2.5 text-center font-black text-slate-800">
                                {mark.score !== null ? mark.score : "-"} / {mark.maxScore}
                              </TableCell>
                              <TableCell className="py-2.5 text-center font-bold text-blue-700">
                                {pct !== "N/A" ? `${pct}%` : "N/A"}
                              </TableCell>
                              <TableCell className="py-2.5 text-right">
                                <Badge className="bg-slate-100 text-slate-700 border-slate-200 text-[10px]">
                                  {mark.status}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Module 2: Health & Medical Records */}
          <Card className="shadow-sm border-slate-200 bg-white">
            <CardHeader className="border-b border-slate-100 pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <HeartPulse className="h-4 w-4 text-rose-600" />
                  Health & Medical File
                </CardTitle>
                <CardDescription className="text-[11px] mt-0.5">
                  Medical conditions, allergies, daily medications, and logged clinic incidents.
                </CardDescription>
              </div>
              <LogClinicVisitForm
                studentId={student.id}
                studentName={user.name || "Student"}
                triggerText="+ Log Visit"
              />
            </CardHeader>
            <CardContent className="p-5 space-y-4 text-xs">
              {/* Medical Badges & Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-400 font-semibold block uppercase text-[10px]">Blood Group</span>
                  <span className="text-rose-700 font-black text-sm">{healthRecord?.bloodGroup || "Not Specified"}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block uppercase text-[10px]">Allergies</span>
                  <span className="text-slate-800 font-semibold">{healthRecord?.allergies || "None Reported"}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block uppercase text-[10px]">Daily Medications</span>
                  <span className="text-slate-800 font-semibold">{healthRecord?.dailyMedications || "None"}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block uppercase text-[10px]">Doctor / Emergency</span>
                  <span className="text-slate-800 font-semibold">{healthRecord?.doctorName || "N/A"} ({healthRecord?.doctorPhone || "No Phone"})</span>
                </div>
              </div>

              {/* Clinic Incident Visits History Table */}
              <div>
                <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                  <Stethoscope className="h-3.5 w-3.5 text-emerald-600" />
                  Recent School Clinic Visits ({clinicVisits.length})
                </h4>

                {clinicVisits.length === 0 ? (
                  <div className="text-center py-6 text-slate-400 text-xs border border-dashed rounded-lg bg-slate-50/50">
                    No medical clinic visits recorded for this student.
                  </div>
                ) : (
                  <div className="rounded-lg border border-slate-200 overflow-hidden">
                    <Table>
                      <TableHeader className="bg-slate-50">
                        <TableRow>
                          <TableHead className="text-[11px] font-bold py-2">Date</TableHead>
                          <TableHead className="text-[11px] font-bold py-2">Reason</TableHead>
                          <TableHead className="text-[11px] font-bold py-2">Symptoms</TableHead>
                          <TableHead className="text-[11px] font-bold py-2">Treatment</TableHead>
                          <TableHead className="text-[11px] font-bold py-2">Logged By</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {clinicVisits.map((visit) => (
                          <TableRow key={visit.id} className="hover:bg-slate-50/50">
                            <TableCell className="py-2.5 font-semibold text-slate-800 whitespace-nowrap" suppressHydrationWarning>
                              {new Date(visit.visitDate).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                            </TableCell>
                            <TableCell className="py-2.5 font-bold text-slate-900">{visit.reason}</TableCell>
                            <TableCell className="py-2.5 text-slate-600">{visit.symptoms || "N/A"}</TableCell>
                            <TableCell className="py-2.5 text-slate-700 font-medium">{visit.treatmentGiven || "N/A"}</TableCell>
                            <TableCell className="py-2.5 text-slate-500">{visit.loggedBy?.name || "Staff"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Module 3: Transport Route & Assignment */}
          <Card className="shadow-sm border-slate-200 bg-white">
            <CardHeader className="border-b border-slate-100 pb-3">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Bus className="h-4 w-4 text-blue-600" />
                Transport & Bus Route State
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4 text-xs">
              {transportAssignment ? (
                <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-200 grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <span className="text-slate-400 font-semibold block uppercase text-[10px]">Active Route</span>
                    <span className="text-blue-900 font-black text-sm">{transportAssignment.routeName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block uppercase text-[10px]">Bus Number</span>
                    <span className="text-slate-800 font-bold text-sm">Bus #{transportAssignment.busNumber}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block uppercase text-[10px]">Pickup Point</span>
                    <span className="text-slate-800 font-semibold">{transportAssignment.pickupPoint}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block uppercase text-[10px]">Drop Point</span>
                    <span className="text-slate-800 font-semibold">{transportAssignment.dropPoint}</span>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-slate-500 text-center">
                  Student currently has no active bus transport assignment.
                </div>
              )}

              {/* Route Change Requests */}
              {transportRequests.length > 0 && (
                <div>
                  <h4 className="font-bold text-slate-900 mb-2">Route Change Requests History</h4>
                  <div className="space-y-2">
                    {transportRequests.map((req) => (
                      <div key={req.id} className="p-3 bg-white rounded-lg border border-slate-200 flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-slate-800">Requested Route: {req.requestedRouteName}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">Reason: {req.reason || "N/A"}</div>
                        </div>
                        <Badge
                          className={
                            req.status === "APPROVED"
                              ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                              : req.status === "REJECTED"
                              ? "bg-rose-100 text-rose-800 border-rose-200"
                              : "bg-amber-100 text-amber-800 border-amber-200"
                          }
                        >
                          {req.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

        </div>

        {/* Right 1 Column: Chronological 360° Timeline */}
        <div className="space-y-6">
          <Card className="shadow-sm border-slate-200 bg-white h-full">
            <CardHeader className="border-b border-slate-100 pb-3">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Clock className="h-4 w-4 text-indigo-600" />
                Chronological 360° Timeline
              </CardTitle>
              <CardDescription className="text-[11px] mt-0.5">
                Audit feed of student milestones, medical visits, and status changes.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5">
              {timelineEvents.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">
                  No chronological events logged yet.
                </div>
              ) : (
                <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                  {timelineEvents.map((evt) => (
                    <div key={evt.id} className="relative group">
                      {/* Timeline Node Icon */}
                      <div className="absolute -left-6 top-0.5 h-5 w-5 rounded-full bg-white border-2 border-indigo-600 flex items-center justify-center text-indigo-600">
                        <div className="h-1.5 w-1.5 rounded-full bg-indigo-600" />
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {getEventTypeBadge(evt.eventType)}
                          <span className="text-[10px] text-slate-400 font-medium" suppressHydrationWarning>
                            {new Date(evt.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <h4 className="font-bold text-slate-900 text-xs">{evt.title}</h4>
                        {evt.description && (
                          <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-2 rounded border border-slate-100">
                            {evt.description}
                          </p>
                        )}
                        {evt.actor && (
                          <div className="text-[10px] text-slate-400 font-medium">
                            By: {evt.actor.name} ({evt.actor.role})
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  )
}
