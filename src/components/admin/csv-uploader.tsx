"use client"

import { useState, useTransition, useEffect, ChangeEvent, DragEvent, useMemo } from "react"
import Papa from "papaparse"
import {
  bulkUploadStudents,
  getOnboardingContext,
  checkExistingStudentIdentifiers,
  OnboardingContextResult,
} from "@/app/actions/onboarding"
import {
  RawStudentRow,
  ValidatedStudentRow,
  validateStudentRows,
  autoResolveStudentRows,
  generateCredentialsCSV,
} from "@/lib/onboarding-validator"
import { toast } from "sonner"
import {
  Upload,
  FileText,
  CheckCircle2,
  Loader2,
  X,
  Download,
  AlertTriangle,
  Wand2,
  Edit3,
  Search,
  Check,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function CsvUploader() {
  const [isPending, startTransition] = useTransition()
  const [onboardingMeta, setOnboardingMeta] = useState<OnboardingContextResult | null>(null)
  const [_rawRows, setRawRows] = useState<RawStudentRow[]>([])
  const [validatedRows, setValidatedRows] = useState<ValidatedStudentRow[]>([])
  const [fileName, setFileName] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [filterMode, setFilterMode] = useState<"ALL" | "ANOMALIES" | "DUPLICATES">("ALL")
  const [searchTerm, setSearchTerm] = useState("")
  const [autoCreateClasses, setAutoCreateClasses] = useState(true)

  // Quick edit modal state
  const [editingRow, setEditingRow] = useState<ValidatedStudentRow | null>(null)
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    rollNumber: "",
    classId: "",
    password: "",
  })

  // Post-upload completion credentials
  const [completedCredentials, setCompletedCredentials] = useState<
    Array<{
      name: string
      email: string
      idOrRoll: string
      classOrSubject: string | null
      password: string
      status: string
    }> | null
  >(null)
  const [uploadStats, setUploadStats] = useState<{ count: number; skipped: number } | null>(null)

  // Fetch school metadata & classes on mount
  useEffect(() => {
    async function loadMeta() {
      const res = await getOnboardingContext()
      if ("error" in res) {
        toast.error(res.error)
      } else {
        setOnboardingMeta(res)
      }
    }
    loadMeta()
  }, [])

  const availableClasses = useMemo(() => onboardingMeta?.classes || [], [onboardingMeta])
  const schoolDomain = onboardingMeta?.schoolDomain || "school.edu"

  const runValidation = async (raw: RawStudentRow[], classes = availableClasses) => {
    const emailsToCheck = raw.map((r) => r.email || "").filter(Boolean)
    const rollsToCheck = raw.map((r) => r.rollNumber || "").filter(Boolean)

    let existingEmails = new Set<string>()
    let existingRolls = new Set<string>()

    if (emailsToCheck.length > 0 || rollsToCheck.length > 0) {
      const checkRes = await checkExistingStudentIdentifiers({
        emails: emailsToCheck,
        rollNumbers: rollsToCheck,
      })
      if (!("error" in checkRes)) {
        existingEmails = new Set(checkRes.existingEmails)
        existingRolls = new Set(checkRes.existingRollNumbers)
      }
    }

    const validated = validateStudentRows(raw, classes, existingEmails, existingRolls)
    setValidatedRows(validated)
  }

  const processFile = (file: File) => {
    if (!file.name.endsWith(".csv")) {
      toast.error("Invalid file format. Please upload a valid CSV file.")
      return
    }

    setFileName(file.name)
    setCompletedCredentials(null)
    setUploadStats(null)

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: "greedy",
      complete: async (results) => {
        if (results.errors.length > 0 && results.data.length === 0) {
          toast.error("Failed to parse CSV file. Please check file structure.")
          return
        }

        // 100% Ingestion: Map all rows without dropping missing name or email rows
        const parsed: RawStudentRow[] = results.data.map((row) => {
          const keys = Object.keys(row)
          const getVal = (name: string) => {
            const matchKey = keys.find((k) => k.trim().toLowerCase() === name.toLowerCase())
            return matchKey ? row[matchKey]?.trim() ?? "" : ""
          }

          const name = getVal("name") || getVal("studentname") || getVal("fullname")
          const email = getVal("email") || getVal("studentemail")
          const rollNumber =
            getVal("studentuniqueid") ||
            getVal("uniqueid") ||
            getVal("studentid") ||
            getVal("admissionno") ||
            getVal("rollnumber") ||
            getVal("rollno") ||
            getVal("roll") ||
            getVal("id")
          const classId = getVal("classid") || getVal("class") || getVal("section") || getVal("grade")
          const password = getVal("password")

          return {
            name,
            email,
            rollNumber,
            classId,
            password,
          }
        })

        if (parsed.length === 0) {
          toast.error("CSV file is empty.")
          setRawRows([])
          setValidatedRows([])
          return
        }

        setRawRows(parsed)
        await runValidation(parsed)
        toast.success(`Parsed ${parsed.length} rows from CSV. Anomaly engine active.`)
      },
      error: (err) => {
        toast.error(`CSV Parsing Error: ${err.message}`)
      },
    })
  }

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) processFile(file)
  }

  const handleClear = () => {
    setRawRows([])
    setValidatedRows([])
    setFileName(null)
    setCompletedCredentials(null)
    setUploadStats(null)
  }

  // Auto-resolve all anomalies
  const handleAutoResolveAll = () => {
    if (validatedRows.length === 0) return
    const resolved = autoResolveStudentRows(validatedRows, availableClasses, schoolDomain)
    setValidatedRows(resolved)
    toast.success("Auto-resolved all missing emails, passwords, unique IDs, and classes!")
  }

  // Open inline fix modal
  const openFixModal = (row: ValidatedStudentRow) => {
    setEditingRow(row)
    setEditForm({
      name: row.name,
      email: row.email,
      rollNumber: row.rollNumber,
      classId: row.resolvedClassId || row.rawClass,
      password: row.password,
    })
  }

  // Save inline fix
  const handleSaveFix = () => {
    if (!editingRow) return

    const updatedRows = validatedRows.map((r) => {
      if (r.rowId === editingRow.rowId) {
        const rawClass = editForm.classId
        const match = availableClasses.find((c) => c.id === rawClass || c.name.toLowerCase() === rawClass.toLowerCase())

        return {
          ...r,
          name: editForm.name.trim(),
          email: editForm.email.trim().toLowerCase(),
          rollNumber: editForm.rollNumber.trim(),
          rawClass,
          resolvedClassId: match ? match.id : null,
          resolvedClassName: match ? match.name : rawClass,
          password: editForm.password.trim(),
          anomalies: [],
          status: "FIXED" as const,
          errorMessages: [],
        }
      }
      return r
    })

    setValidatedRows(updatedRows)
    setEditingRow(null)
    toast.success(`Updated ${editForm.name || "student record"}`)
  }

  // Filtered rows for preview table
  const displayedRows = useMemo(() => {
    return validatedRows.filter((r) => {
      // Filter tab
      if (filterMode === "ANOMALIES" && r.status !== "ANOMALY") return false
      if (filterMode === "DUPLICATES" && r.status !== "DUPLICATE_DB" && r.status !== "DUPLICATE_CSV") return false

      // Search
      if (searchTerm.trim().length > 0) {
        const q = searchTerm.toLowerCase()
        const matchesName = r.name.toLowerCase().includes(q)
        const matchesEmail = r.email.toLowerCase().includes(q)
        const matchesRoll = r.rollNumber.toLowerCase().includes(q)
        const matchesClass = (r.resolvedClassName || r.rawClass).toLowerCase().includes(q)
        if (!matchesName && !matchesEmail && !matchesRoll && !matchesClass) return false
      }

      return true
    })
  }, [validatedRows, filterMode, searchTerm])

  // Summary counts
  const totalCount = validatedRows.length
  const anomalyCount = validatedRows.filter((r) => r.status === "ANOMALY").length
  const duplicateCount = validatedRows.filter(
    (r) => r.status === "DUPLICATE_DB" || r.status === "DUPLICATE_CSV"
  ).length
  const readyCount = validatedRows.filter((r) => r.status === "READY" || r.status === "FIXED").length

  const handleUpload = () => {
    if (validatedRows.length === 0) return

    // Prepare payload
    const payload = validatedRows.map((r) => ({
      name: r.name,
      email: r.email,
      rollNumber: r.rollNumber || null,
      classId: r.resolvedClassName || r.rawClass || null,
      password: r.password || null,
      anomalies: r.anomalies,
    }))

    startTransition(async () => {
      const res = await bulkUploadStudents(payload, {
        autoCreateMissingClasses: autoCreateClasses,
        skipDuplicates: true,
      })

      if ("error" in res && res.error) {
        toast.error(res.error)
        return
      }

      if (res.success) {
        setUploadStats({ count: res.count, skipped: res.skippedCount })
        setCompletedCredentials(res.credentials)
        toast.success(
          `Onboarding Complete: ${res.count} students enrolled! (${res.skippedCount} duplicates safely skipped)`
        )
      }
    })
  }

  const downloadCredentials = () => {
    if (!completedCredentials || completedCredentials.length === 0) return
    const csvContent = generateCredentialsCSV(completedCredentials, "STUDENT")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `student_credentials_${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
    toast.success("Credentials CSV downloaded.")
  }

  return (
    <div className="w-full max-w-4xl bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-bold tracking-tight text-slate-900">Student CSV Onboarding Engine</h3>
            <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
              V2 Resilient
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            100% row ingestion, automated anomaly resolution, instant inline fixing, and batch credentials export.
          </p>
        </div>
        <a
          href="data:text/csv;charset=utf-8,StudentUniqueID,Name,Email,Class,Password%0ASTU-1001,John%20Doe,john@school.edu,Grade%2010-A,Student@123%0ASTU-1002,Jane%20Smith,jane@school.edu,Grade%2010-B,Student@123"
          download="student_onboarding_template.csv"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors w-fit"
        >
          <Download className="h-3.5 w-3.5" />
          Download CSV Template
        </a>
      </div>

      {/* Upload Zone (when no file active) */}
      {!fileName && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-xl p-10 text-center transition-all cursor-pointer bg-slate-50/70 hover:bg-slate-50 ${
            isDragging ? "border-blue-500 bg-blue-50/50" : "border-slate-300"
          }`}
        >
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />

          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="p-4 bg-white rounded-full border border-slate-200 shadow-sm text-blue-600">
              <Upload className="h-8 w-8" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">
                Click to upload student CSV <span className="font-normal text-slate-500">or drag and drop</span>
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Supports up to 5,000+ rows. Handles missing emails, duplicate IDs, unmatched classes, and blank passwords.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Completion Banner */}
      {completedCredentials && uploadStats && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <h4 className="font-bold text-emerald-950 text-base">Onboarding Successfully Executed!</h4>
                <p className="text-xs text-emerald-700 mt-0.5">
                  <span className="font-bold">{uploadStats.count}</span> students onboarded into {onboardingMeta?.schoolName}.{" "}
                  {uploadStats.skipped > 0 && <span>({uploadStats.skipped} duplicate records safely skipped)</span>}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClear}
              className="text-xs border-emerald-300 text-emerald-800 hover:bg-emerald-100"
            >
              Upload Another CSV
            </Button>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
            <Button
              onClick={downloadCredentials}
              className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs gap-2 shadow-sm"
            >
              <Download className="h-4 w-4" />
              Download Student Credentials (CSV)
            </Button>
            <p className="text-[11px] text-emerald-700">
              Contains Student Unique IDs, login emails, temporary passwords, and assigned classes.
            </p>
          </div>
        </div>
      )}

      {/* Active File Preview & Anomaly Dashboard */}
      {fileName && !completedCredentials && (
        <div className="space-y-5">
          {/* File bar */}
          <div className="flex items-center justify-between bg-slate-100/90 px-4 py-3 rounded-lg border border-slate-200">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-xs font-bold text-slate-800">{fileName}</p>
                <p className="text-[11px] text-slate-500">
                  {totalCount} total rows parsed &bull; 100% ingested into memory
                </p>
              </div>
            </div>
            <button
              onClick={handleClear}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-md transition-colors"
              title="Remove file"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200">
              <p className="text-[11px] font-medium text-slate-500">Total Rows</p>
              <p className="text-xl font-bold text-slate-900 mt-1">{totalCount}</p>
            </div>
            <div className="p-3.5 bg-emerald-50 rounded-lg border border-emerald-200">
              <p className="text-[11px] font-medium text-emerald-700">Ready / Valid</p>
              <p className="text-xl font-bold text-emerald-900 mt-1">{readyCount}</p>
            </div>
            <div
              onClick={() => setFilterMode("ANOMALIES")}
              className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
                anomalyCount > 0
                  ? "bg-amber-50 border-amber-300 hover:bg-amber-100/60"
                  : "bg-slate-50 border-slate-200"
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold text-amber-800">Anomalies</p>
                {anomalyCount > 0 && <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />}
              </div>
              <p className="text-xl font-bold text-amber-900 mt-1">{anomalyCount}</p>
            </div>
            <div
              onClick={() => setFilterMode("DUPLICATES")}
              className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
                duplicateCount > 0
                  ? "bg-purple-50 border-purple-300 hover:bg-purple-100/60"
                  : "bg-slate-50 border-slate-200"
              }`}
            >
              <p className="text-[11px] font-semibold text-purple-800">Duplicates</p>
              <p className="text-xl font-bold text-purple-900 mt-1">{duplicateCount}</p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
              <button
                onClick={() => setFilterMode("ALL")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  filterMode === "ALL"
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                All Records ({totalCount})
              </button>
              <button
                onClick={() => setFilterMode("ANOMALIES")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 ${
                  filterMode === "ANOMALIES"
                    ? "bg-amber-600 text-white"
                    : "bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100"
                }`}
              >
                <AlertTriangle className="h-3 w-3" />
                Show Only Anomaly Students ({anomalyCount})
              </button>
              {duplicateCount > 0 && (
                <button
                  onClick={() => setFilterMode("DUPLICATES")}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                    filterMode === "DUPLICATES"
                      ? "bg-purple-700 text-white"
                      : "bg-purple-50 text-purple-800 border border-purple-200 hover:bg-purple-100"
                  }`}
                >
                  Duplicates ({duplicateCount})
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="relative w-full sm:w-48">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <Input
                  placeholder="Search students..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 h-8 text-xs bg-slate-50"
                />
              </div>
              {anomalyCount > 0 && (
                <Button
                  size="sm"
                  onClick={handleAutoResolveAll}
                  className="h-8 text-xs bg-amber-600 hover:bg-amber-700 text-white font-semibold gap-1.5 shrink-0"
                >
                  <Wand2 className="h-3.5 w-3.5" />
                  Auto-Resolve All
                </Button>
              )}
            </div>
          </div>

          {/* Table Preview */}
          <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
            <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 text-xs font-semibold text-slate-600 flex items-center justify-between">
              <span>
                Showing {displayedRows.length} of {totalCount} records
              </span>
              <label className="flex items-center gap-1.5 text-[11px] font-normal text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoCreateClasses}
                  onChange={(e) => setAutoCreateClasses(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                />
                Auto-create unmatched classes during upload
              </label>
            </div>

            <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 text-xs">
              {displayedRows.length === 0 ? (
                <div className="p-8 text-center text-slate-400">No records found matching current filter.</div>
              ) : (
                displayedRows.map((row) => (
                  <div
                    key={row.rowId}
                    className={`px-4 py-2.5 flex items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors ${
                      row.status === "ANOMALY" ? "bg-amber-50/30" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-mono text-[11px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 shrink-0">
                        {row.rollNumber || "NO-ID"}
                      </span>
                      <div className="truncate">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900">{row.name || "Unnamed"}</span>
                          {row.isAutoResolved && (
                            <span className="bg-emerald-100 text-emerald-800 text-[10px] px-1.5 py-0.2 rounded font-medium">
                              Auto-Fixed
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 truncate">
                          {row.email || "no-email@missing"} &bull; Class:{" "}
                          <span className="font-medium text-slate-700">
                            {row.resolvedClassName || row.rawClass || "Unassigned"}
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Anomaly Badges */}
                      {row.status === "DUPLICATE_DB" && (
                        <span className="bg-purple-100 text-purple-800 border border-purple-200 text-[10px] font-semibold px-2 py-0.5 rounded">
                          Already Uploaded
                        </span>
                      )}
                      {row.status === "DUPLICATE_CSV" && (
                        <span className="bg-purple-100 text-purple-800 border border-purple-200 text-[10px] font-semibold px-2 py-0.5 rounded">
                          Duplicate in CSV
                        </span>
                      )}
                      {row.anomalies.includes("MISSING_EMAIL") && (
                        <span className="bg-rose-100 text-rose-800 border border-rose-200 text-[10px] font-semibold px-2 py-0.5 rounded">
                          Missing Email
                        </span>
                      )}
                      {row.anomalies.includes("INVALID_EMAIL") && (
                        <span className="bg-rose-100 text-rose-800 border border-rose-200 text-[10px] font-semibold px-2 py-0.5 rounded">
                          Invalid Email
                        </span>
                      )}
                      {row.anomalies.includes("UNMATCHED_CLASS") && (
                        <span className="bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-semibold px-2 py-0.5 rounded">
                          Unmatched Class
                        </span>
                      )}

                      {/* Inline Fix Button */}
                      {(row.status === "ANOMALY" || row.status === "DUPLICATE_CSV" || row.status === "DUPLICATE_DB") && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openFixModal(row)}
                          className="h-7 px-2 text-[11px] font-semibold text-blue-700 border-blue-200 hover:bg-blue-50 gap-1"
                        >
                          <Edit3 className="h-3 w-3" />
                          Fix
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Upload Button */}
          <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-100 pt-4 gap-3">
            <p className="text-xs text-slate-500">
              <span className="font-semibold text-slate-800">{readyCount}</span> students ready to be onboarded. Duplicates
              will be skipped safely.
            </p>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={handleClear}
                disabled={isPending}
                className="w-full sm:w-auto text-xs"
              >
                Clear
              </Button>
              <Button
                onClick={handleUpload}
                disabled={isPending || readyCount === 0}
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs gap-2 shadow-sm"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Onboarding Students in Batches...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Upload &amp; Enroll {readyCount} Students
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Edit Row Modal */}
      {editingRow && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Fix Student Details</h4>
                <p className="text-[11px] text-slate-500">Resolve anomalies for row: {editingRow.rowId}</p>
              </div>
              <button onClick={() => setEditingRow(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Student Name</label>
                <Input
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  placeholder="e.g. John Doe"
                  className="h-8 text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Student Email</label>
                <Input
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  placeholder="e.g. stu1001@student.school.edu"
                  className="h-8 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Unique ID / Roll No</label>
                  <Input
                    value={editForm.rollNumber}
                    onChange={(e) => setEditForm({ ...editForm, rollNumber: e.target.value })}
                    placeholder="e.g. STU-1001"
                    className="h-8 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Class Assignment</label>
                  <select
                    value={editForm.classId}
                    onChange={(e) => setEditForm({ ...editForm, classId: e.target.value })}
                    className="w-full h-8 px-2 border rounded-md text-xs bg-white text-slate-800"
                  >
                    <option value="">Unassigned</option>
                    {availableClasses.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Temporary Password</label>
                <Input
                  value={editForm.password}
                  onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                  placeholder="Leave blank for auto-generated password"
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <Button variant="outline" size="sm" onClick={() => setEditingRow(null)} className="text-xs">
                Cancel
              </Button>
              <Button size="sm" onClick={handleSaveFix} className="bg-blue-600 hover:bg-blue-700 text-white text-xs">
                Save &amp; Resolve
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
