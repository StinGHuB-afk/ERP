"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { upsertHealthRecord } from "@/app/actions/enterprise"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { HeartPulse, CheckCircle2, AlertCircle, Loader2, Edit3 } from "lucide-react"

interface InitialHealthRecord {
  bloodGroup?: string | null
  allergies?: string | null
  dailyMedications?: string | null
  emergencyMedicalProtocol?: string | null
  chronicConditions?: string | null
  dietaryRestrictions?: string | null
  doctorName?: string | null
  doctorPhone?: string | null
  insuranceProvider?: string | null
  insurancePolicyNumber?: string | null
}

interface UpdateHealthRecordFormProps {
  studentId: string
  studentName?: string
  initialData?: InitialHealthRecord | null
  triggerText?: string
  className?: string
  variant?: "default" | "outline" | "secondary"
}

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]

export function UpdateHealthRecordForm({
  studentId,
  studentName = "Student",
  initialData,
  triggerText = "Update Medical File",
  className = "",
  variant = "outline",
}: UpdateHealthRecordFormProps) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const [bloodGroup, setBloodGroup] = useState(initialData?.bloodGroup || "")
  const [allergies, setAllergies] = useState(initialData?.allergies || "")
  const [dailyMedications, setDailyMedications] = useState(initialData?.dailyMedications || "")
  const [emergencyMedicalProtocol, setEmergencyMedicalProtocol] = useState(initialData?.emergencyMedicalProtocol || "")
  const [chronicConditions, setChronicConditions] = useState(initialData?.chronicConditions || "")
  const [dietaryRestrictions, setDietaryRestrictions] = useState(initialData?.dietaryRestrictions || "")
  const [doctorName, setDoctorName] = useState(initialData?.doctorName || "")
  const [doctorPhone, setDoctorPhone] = useState(initialData?.doctorPhone || "")
  const [insuranceProvider, setInsuranceProvider] = useState(initialData?.insuranceProvider || "")
  const [insurancePolicyNumber, setInsurancePolicyNumber] = useState(initialData?.insurancePolicyNumber || "")

  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccessMsg(null)

    startTransition(async () => {
      const res = await upsertHealthRecord({
        studentId,
        bloodGroup: bloodGroup.trim() || undefined,
        allergies: allergies.trim() || undefined,
        dailyMedications: dailyMedications.trim() || undefined,
        emergencyMedicalProtocol: emergencyMedicalProtocol.trim() || undefined,
        chronicConditions: chronicConditions.trim() || undefined,
        dietaryRestrictions: dietaryRestrictions.trim() || undefined,
        doctorName: doctorName.trim() || undefined,
        doctorPhone: doctorPhone.trim() || undefined,
        insuranceProvider: insuranceProvider.trim() || undefined,
        insurancePolicyNumber: insurancePolicyNumber.trim() || undefined,
      })

      if (res.success) {
        setSuccessMsg("Health & medical record updated successfully!")
        setTimeout(() => {
          setOpen(false)
          setSuccessMsg(null)
          router.refresh()
        }, 1200)
      } else {
        setError(res.error || "Failed to update health record.")
      }
    })
  }

  return (
    <>
      <Button
        variant={variant}
        size="sm"
        onClick={() => setOpen(true)}
        className={`h-8 text-xs font-semibold gap-1.5 ${className}`}
      >
        <Edit3 className="h-3.5 w-3.5 text-rose-600" />
        <span>{triggerText}</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto bg-white border border-slate-200 shadow-xl rounded-2xl p-6">
        <DialogHeader className="border-b border-slate-100 pb-3">
          <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <HeartPulse className="h-5 w-5 text-rose-600" />
            Update Health & Medical File
          </DialogTitle>
          <p className="text-xs text-slate-500">
            Managing medical profile & blood group for <strong className="text-slate-800">{studentName}</strong>.
          </p>
        </DialogHeader>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-3 rounded-lg flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-3 rounded-lg flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Blood Group & Primary Health Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Blood Group <span className="text-rose-500">*</span>
              </label>
              <select
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value)}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-rose-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20"
              >
                <option value="">Select Blood Group</option>
                {BLOOD_GROUPS.map((bg) => (
                  <option key={bg} value={bg}>
                    {bg}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Allergies
              </label>
              <input
                type="text"
                value={allergies}
                onChange={(e) => setAllergies(e.target.value)}
                placeholder="e.g. Peanuts, Penicillin, Dust"
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Daily Medications
              </label>
              <input
                type="text"
                value={dailyMedications}
                onChange={(e) => setDailyMedications(e.target.value)}
                placeholder="e.g. Inhaler 2x daily"
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Chronic Conditions
              </label>
              <input
                type="text"
                value={chronicConditions}
                onChange={(e) => setChronicConditions(e.target.value)}
                placeholder="e.g. Asthma, Diabetes"
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Dietary Restrictions
              </label>
              <input
                type="text"
                value={dietaryRestrictions}
                onChange={(e) => setDietaryRestrictions(e.target.value)}
                placeholder="e.g. Vegetarian, Lactose Intolerant"
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Emergency Protocol
              </label>
              <input
                type="text"
                value={emergencyMedicalProtocol}
                onChange={(e) => setEmergencyMedicalProtocol(e.target.value)}
                placeholder="e.g. EpiPen in nurse office"
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          <div className="border-t border-slate-100 pt-3">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
              Doctor & Insurance Details
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Doctor Name</label>
                <input
                  type="text"
                  value={doctorName}
                  onChange={(e) => setDoctorName(e.target.value)}
                  placeholder="Dr. John Smith"
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Doctor Phone</label>
                <input
                  type="text"
                  value={doctorPhone}
                  onChange={(e) => setDoctorPhone(e.target.value)}
                  placeholder="+1 555-0192"
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Insurance Provider</label>
                <input
                  type="text"
                  value={insuranceProvider}
                  onChange={(e) => setInsuranceProvider(e.target.value)}
                  placeholder="BlueCross"
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Insurance Policy #</label>
                <input
                  type="text"
                  value={insurancePolicyNumber}
                  onChange={(e) => setInsurancePolicyNumber(e.target.value)}
                  placeholder="POL-99201"
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
              className="text-xs h-9 px-4"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-9 px-4 gap-1.5"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Save Medical File</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  </>
  )
}
