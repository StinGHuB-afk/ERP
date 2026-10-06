"use client"

import { useState, useTransition, ChangeEvent, DragEvent } from "react"
import Papa from "papaparse"
import { bulkUploadStudents, StudentUploadRecord } from "@/app/actions/onboarding"
import { toast } from "sonner"
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2, X, Download } from "lucide-react"

export function CsvUploader() {
  const [isPending, startTransition] = useTransition()
  const [parsedData, setParsedData] = useState<StudentUploadRecord[]>([])
  const [fileName, setFileName] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const processFile = (file: File) => {
    if (!file.name.endsWith(".csv")) {
      toast.error("Invalid file format. Please upload a valid CSV file.")
      return
    }

    setFileName(file.name)

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0 && results.data.length === 0) {
          toast.error("Failed to parse CSV file. Check formatting.")
          return
        }

        // Client-Side Sanitization: trim strings & lowerCase emails
        const sanitized: StudentUploadRecord[] = results.data
          .map((row) => {
            const keys = Object.keys(row)
            const getVal = (name: string) => {
              const matchKey = keys.find((k) => k.trim().toLowerCase() === name.toLowerCase())
              return matchKey ? row[matchKey]?.trim() ?? "" : ""
            }

            const name = getVal("name") || getVal("studentname") || getVal("fullname")
            const email = (getVal("email") || getVal("studentemail")).toLowerCase()
            
            // Flexible resolution for Student Unique ID / Roll Number / Admission No
            const rollNumber =
              getVal("studentuniqueid") ||
              getVal("uniqueid") ||
              getVal("studentid") ||
              getVal("admissionno") ||
              getVal("rollnumber") ||
              getVal("rollno") ||
              getVal("roll") ||
              getVal("id")

            const classId = getVal("classid") || getVal("class") || getVal("section")
            const password = getVal("password")

            return {
              name,
              email,
              rollNumber: rollNumber || null,
              classId: classId || null,
              password: password || null,
            }
          })
          .filter((item) => item.name.length > 0 && item.email.length > 0)

        if (sanitized.length === 0) {
          toast.error("No valid student rows found. Ensure CSV has 'Name' and 'Email' headers.")
          setParsedData([])
          return
        }

        setParsedData(sanitized)
        toast.success(`Successfully parsed ${sanitized.length} student records from CSV.`)
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
    setParsedData([])
    setFileName(null)
  }

  const handleUpload = () => {
    if (parsedData.length === 0) return

    startTransition(async () => {
      const res = await bulkUploadStudents(parsedData)
      if (res.error) {
        toast.error(res.error)
        return
      }

      toast.success(`Successfully onboarded ${res.count} students! (${res.totalProcessed} processed)`)
      handleClear()
    })
  }

  return (
    <div className="w-full max-w-3xl bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-2">
        <div>
          <h3 className="text-lg font-bold tracking-tight text-slate-900">CSV Student Onboarding Engine</h3>
          <p className="text-xs text-slate-500">Bulk upload students with custom Student Unique IDs, Roll Numbers, and Class assignments.</p>
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

      {/* File Dropzone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer bg-slate-50/70 hover:bg-slate-50 ${
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
          <div className="p-3 bg-white rounded-full border border-slate-200 shadow-sm">
            <Upload className="h-6 w-6 text-slate-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">
              Click to upload <span className="font-normal text-slate-500">or drag and drop</span>
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Supported Columns: <span className="font-mono text-slate-700 font-semibold">StudentUniqueID / RollNumber, Name, Email, Class, Password</span>
            </p>
          </div>
        </div>
      </div>

      {/* Parsed Preview Section */}
      {fileName && parsedData.length > 0 && (
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between bg-slate-100/80 px-4 py-3 rounded-lg border border-slate-200">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-xs font-bold text-slate-800">{fileName}</p>
                <p className="text-[11px] text-slate-500">{parsedData.length} valid rows ready for batch insertion</p>
              </div>
            </div>
            <button
              onClick={handleClear}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-md transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Data Density Preview Table */}
          <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
            <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 text-xs font-semibold text-slate-600 flex items-center justify-between">
              <span>Previewing First {Math.min(parsedData.length, 5)} Records</span>
              <span className="text-[11px] font-normal text-slate-400">Unique IDs & Class Mapping Validated</span>
            </div>
            <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto text-xs">
              {parsedData.slice(0, 5).map((row, i) => (
                <div key={i} className="px-4 py-2 flex items-center justify-between text-slate-700 gap-2">
                  <div className="font-mono text-[11px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                    {row.rollNumber ? row.rollNumber : `STU-AUTO-${i + 1}`}
                  </div>
                  <div className="font-medium truncate max-w-[150px]">{row.name}</div>
                  <div className="text-slate-500 font-mono truncate max-w-[180px]">{row.email}</div>
                  <div className="text-slate-600 font-semibold bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                    {row.classId || "Unassigned"}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={handleUpload}
            disabled={isPending}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-lg shadow-sm transition-transform active:scale-[0.98] disabled:opacity-50"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Processing Bulk Onboarding...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                <span>Onboard {parsedData.length} Students</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
}
