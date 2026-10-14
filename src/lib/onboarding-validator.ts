export type AnomalyType =
  | "MISSING_NAME"
  | "MISSING_EMAIL"
  | "INVALID_EMAIL"
  | "MISSING_CLASS"
  | "UNMATCHED_CLASS"
  | "DUPLICATE_IN_CSV"
  | "DUPLICATE_IN_DB"
  | "MISSING_PASSWORD"
  | "MISSING_ROLL_NUMBER"
  | "MISSING_TEACHER_ID"

export interface RawStudentRow {
  name?: string
  email?: string
  rollNumber?: string
  classId?: string
  password?: string
  [key: string]: string | undefined
}

export interface ValidatedStudentRow {
  rowId: string
  name: string
  email: string
  rollNumber: string
  rawClass: string
  resolvedClassId: string | null
  resolvedClassName: string | null
  password: string
  anomalies: AnomalyType[]
  status: "READY" | "ANOMALY" | "DUPLICATE_DB" | "DUPLICATE_CSV" | "FIXED"
  errorMessages: string[]
  isAutoResolved?: boolean
}

export interface RawTeacherRow {
  name?: string
  email?: string
  teacherId?: string
  specialization?: string
  qualification?: string
  password?: string
  [key: string]: string | undefined
}

export interface ValidatedTeacherRow {
  rowId: string
  name: string
  email: string
  teacherId: string
  specialization: string
  qualification: string
  password: string
  anomalies: AnomalyType[]
  status: "READY" | "ANOMALY" | "DUPLICATE_DB" | "DUPLICATE_CSV" | "FIXED"
  errorMessages: string[]
  isAutoResolved?: boolean
}

export const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/

export function normalizeClassName(raw?: string | null): string {
  if (!raw) return ""
  let s = raw.trim().toLowerCase()
  // Replace Roman numerals in common formats
  s = s.replace(/\b(xii)\b/g, "12")
       .replace(/\b(xi)\b/g, "11")
       .replace(/\b(x)\b/g, "10")
       .replace(/\b(ix)\b/g, "9")
       .replace(/\b(viii)\b/g, "8")
       .replace(/\b(vii)\b/g, "7")
       .replace(/\b(vi)\b/g, "6")
       .replace(/\b(v)\b/g, "5")
       .replace(/\b(iv)\b/g, "4")
       .replace(/\b(iii)\b/g, "3")
       .replace(/\b(ii)\b/g, "2")
       .replace(/\b(i)\b/g, "1")

  // Remove keywords and ordinal suffixes
  s = s.replace(/\b(grade|class|standard|std)\b/g, "")
       .replace(/(\d+)(st|nd|rd|th)\b/g, "$1")
       .replace(/[^a-z0-9]/g, "") // strip spaces, hyphens, parentheses
  return s.trim()
}

export function matchClassToAvailable(
  rawInput: string | null | undefined,
  availableClasses: Array<{ id: string; name: string }>
): { resolvedClassId: string | null; resolvedClassName: string | null; isMatch: boolean; isFuzzy: boolean } {
  if (!rawInput || !rawInput.trim()) {
    return { resolvedClassId: null, resolvedClassName: null, isMatch: false, isFuzzy: false }
  }
  const raw = rawInput.trim()
  const rawLower = raw.toLowerCase()

  // 1. Direct ID match
  const exactId = availableClasses.find((c) => c.id.toLowerCase() === rawLower)
  if (exactId) {
    return { resolvedClassId: exactId.id, resolvedClassName: exactId.name, isMatch: true, isFuzzy: false }
  }

  // 2. Exact Name match (case-insensitive)
  const exactName = availableClasses.find((c) => c.name.toLowerCase().trim() === rawLower)
  if (exactName) {
    return { resolvedClassId: exactName.id, resolvedClassName: exactName.name, isMatch: true, isFuzzy: false }
  }

  // 3. Normalized alphanumeric match (e.g. "Grade 10-A" vs "10th A" or "10A")
  const normRaw = normalizeClassName(raw)
  if (normRaw) {
    const normMatch = availableClasses.find((c) => normalizeClassName(c.name) === normRaw)
    if (normMatch) {
      return { resolvedClassId: normMatch.id, resolvedClassName: normMatch.name, isMatch: true, isFuzzy: true }
    }
  }

  // 4. Grade number heuristic match (e.g. "class 10" or "Grade 10" matches "Class 10 (dps)" or "Grade 10-A")
  const gradeMatch = raw.match(/\b\d+\b/)?.[0]
  if (gradeMatch) {
    const partialMatch = availableClasses.find((c) => {
      const cGrade = c.name.match(/\b\d+\b/)?.[0]
      return cGrade === gradeMatch
    })
    if (partialMatch) {
      return { resolvedClassId: partialMatch.id, resolvedClassName: partialMatch.name, isMatch: true, isFuzzy: true }
    }
  }

  return { resolvedClassId: null, resolvedClassName: null, isMatch: false, isFuzzy: false }
}

export function validateStudentRows(
  rows: RawStudentRow[],
  availableClasses: Array<{ id: string; name: string }>,
  existingEmails: Set<string> = new Set(),
  existingRollNumbers: Set<string> = new Set()
): ValidatedStudentRow[] {
  const seenEmails = new Set<string>()
  const duplicateEmailsInCSV = new Set<string>()
  const seenRollNumbers = new Set<string>()
  const duplicateRollsInCSV = new Set<string>()

  // First pass: identify duplicates within CSV
  for (const r of rows) {
    const email = (r.email || "").trim().toLowerCase()
    if (email) {
      if (seenEmails.has(email)) {
        duplicateEmailsInCSV.add(email)
      } else {
        seenEmails.add(email)
      }
    }
    const roll = (r.rollNumber || "").trim().toLowerCase()
    if (roll) {
      if (seenRollNumbers.has(roll)) {
        duplicateRollsInCSV.add(roll)
      } else {
        seenRollNumbers.add(roll)
      }
    }
  }

  // Second pass: full anomaly classification
  return rows.map((r, index) => {
    const rowId = `stu-row-${index + 1}`
    const name = (r.name || "").trim()
    const email = (r.email || "").trim().toLowerCase()
    const rollNumber = (r.rollNumber || "").trim()
    const rawClass = (r.classId || "").trim()
    const password = (r.password || "").trim()

    const anomalies: AnomalyType[] = []
    const errorMessages: string[] = []

    if (!name) {
      anomalies.push("MISSING_NAME")
      errorMessages.push("Student name is missing.")
    }

    if (!email) {
      anomalies.push("MISSING_EMAIL")
      errorMessages.push("Student email is missing.")
    } else if (!EMAIL_REGEX.test(email)) {
      anomalies.push("INVALID_EMAIL")
      errorMessages.push(`Malformed email format: "${email}"`)
    } else if (existingEmails.has(email)) {
      anomalies.push("DUPLICATE_IN_DB")
      errorMessages.push(`Email already exists in database (Already Uploaded).`)
    } else if (duplicateEmailsInCSV.has(email)) {
      anomalies.push("DUPLICATE_IN_CSV")
      errorMessages.push(`Email appears multiple times in this CSV batch.`)
    }

    if (!rollNumber) {
      anomalies.push("MISSING_ROLL_NUMBER")
      errorMessages.push("Student Unique ID / Roll Number is missing.")
    } else if (existingRollNumbers.has(rollNumber.toLowerCase())) {
      anomalies.push("DUPLICATE_IN_DB")
      errorMessages.push(`Roll number "${rollNumber}" already exists in database.`)
    } else if (duplicateRollsInCSV.has(rollNumber.toLowerCase())) {
      anomalies.push("DUPLICATE_IN_CSV")
      errorMessages.push(`Roll number "${rollNumber}" appears multiple times in this CSV batch.`)
    }

    let resolvedClassId: string | null = null
    let resolvedClassName: string | null = null

    if (!rawClass) {
      anomalies.push("MISSING_CLASS")
      errorMessages.push("Class assignment is missing.")
    } else {
      const match = matchClassToAvailable(rawClass, availableClasses)
      if (match.isMatch) {
        resolvedClassId = match.resolvedClassId
        resolvedClassName = match.resolvedClassName
      } else {
        anomalies.push("UNMATCHED_CLASS")
        errorMessages.push(`Class "${rawClass}" does not match any class in school.`)
      }
    }

    if (!password) {
      anomalies.push("MISSING_PASSWORD")
      errorMessages.push("Password is not specified (auto-default will be applied).")
    }

    let status: ValidatedStudentRow["status"] = "READY"
    if (anomalies.includes("DUPLICATE_IN_DB")) {
      status = "DUPLICATE_DB"
    } else if (anomalies.includes("DUPLICATE_IN_CSV")) {
      status = "DUPLICATE_CSV"
    } else if (anomalies.some((a) => a !== "MISSING_PASSWORD")) {
      status = "ANOMALY"
    }

    return {
      rowId,
      name,
      email,
      rollNumber,
      rawClass,
      resolvedClassId,
      resolvedClassName,
      password,
      anomalies,
      status,
      errorMessages,
    }
  })
}

export function autoResolveStudentRows(
  rows: ValidatedStudentRow[],
  availableClasses: Array<{ id: string; name: string }>,
  schoolDomain: string = "school.edu"
): ValidatedStudentRow[] {
  const currentYear = new Date().getFullYear()
  const usedEmails = new Set<string>()
  const usedRollNumbers = new Set<string>()

  // Register all known clean emails and roll numbers
  for (const r of rows) {
    if (r.email && EMAIL_REGEX.test(r.email) && !r.anomalies.includes("DUPLICATE_IN_CSV")) {
      usedEmails.add(r.email.toLowerCase())
    }
    if (r.rollNumber && !r.anomalies.includes("DUPLICATE_IN_CSV")) {
      usedRollNumbers.add(r.rollNumber.toLowerCase())
    }
  }

  let counter = 1000

  return rows.map((row) => {
    let { name, email, rollNumber, resolvedClassId, resolvedClassName, password } = row
    const rawClass = row.rawClass
    const anomalies: AnomalyType[] = []
    const errorMessages: string[] = []

    // 1. Resolve Name
    if (!name.trim()) {
      name = `Student ${counter}`
    }

    // 2. Resolve Roll Number
    if (!rollNumber.trim() || row.anomalies.includes("DUPLICATE_IN_CSV") || row.anomalies.includes("DUPLICATE_IN_DB")) {
      do {
        counter++
        rollNumber = `STU-${currentYear}-${counter}`
      } while (usedRollNumbers.has(rollNumber.toLowerCase()))
      usedRollNumbers.add(rollNumber.toLowerCase())
    }

    // 3. Resolve Email
    if (!email || !EMAIL_REGEX.test(email) || row.anomalies.includes("DUPLICATE_IN_CSV") || row.anomalies.includes("DUPLICATE_IN_DB")) {
      const cleanSlug = rollNumber.toLowerCase().replace(/[^a-z0-9]/g, "")
      let generatedEmail = `${cleanSlug}@student.${schoolDomain}`
      let suffix = 1
      while (usedEmails.has(generatedEmail)) {
        generatedEmail = `${cleanSlug}${suffix}@student.${schoolDomain}`
        suffix++
      }
      email = generatedEmail
      usedEmails.add(email)
    }

    // 4. Resolve Class
    if (!resolvedClassId) {
      if (rawClass) {
        const match = matchClassToAvailable(rawClass, availableClasses)
        if (match.isMatch) {
          resolvedClassId = match.resolvedClassId
          resolvedClassName = match.resolvedClassName
        } else if (availableClasses.length > 0) {
          // If unmatched, assign to first available class as safe fallback
          resolvedClassId = availableClasses[0].id
          resolvedClassName = availableClasses[0].name
        }
      } else if (availableClasses.length > 0) {
        resolvedClassId = availableClasses[0].id
        resolvedClassName = availableClasses[0].name
      }
    }

    // 5. Resolve Password
    if (!password || password.trim().length === 0) {
      const idPart = rollNumber.replace(/[^a-zA-Z0-9]/g, "")
      password = `Stu@${idPart || currentYear}`
    }

    return {
      ...row,
      name,
      email,
      rollNumber,
      rawClass,
      resolvedClassId,
      resolvedClassName,
      password,
      anomalies,
      errorMessages,
      status: "FIXED",
      isAutoResolved: true,
    }
  })
}

export function validateTeacherRows(
  rows: RawTeacherRow[],
  existingEmails: Set<string> = new Set(),
  existingTeacherIds: Set<string> = new Set()
): ValidatedTeacherRow[] {
  const seenEmails = new Set<string>()
  const duplicateEmailsInCSV = new Set<string>()
  const seenIds = new Set<string>()
  const duplicateIdsInCSV = new Set<string>()

  for (const r of rows) {
    const email = (r.email || "").trim().toLowerCase()
    if (email) {
      if (seenEmails.has(email)) duplicateEmailsInCSV.add(email)
      else seenEmails.add(email)
    }
    const tid = (r.teacherId || "").trim().toLowerCase()
    if (tid) {
      if (seenIds.has(tid)) duplicateIdsInCSV.add(tid)
      else seenIds.add(tid)
    }
  }

  return rows.map((r, index) => {
    const rowId = `tch-row-${index + 1}`
    const name = (r.name || "").trim()
    const email = (r.email || "").trim().toLowerCase()
    const teacherId = (r.teacherId || "").trim()
    const specialization = (r.specialization || "").trim()
    const qualification = (r.qualification || "").trim()
    const password = (r.password || "").trim()

    const anomalies: AnomalyType[] = []
    const errorMessages: string[] = []

    if (!name) {
      anomalies.push("MISSING_NAME")
      errorMessages.push("Teacher name is missing.")
    }

    if (!email) {
      anomalies.push("MISSING_EMAIL")
      errorMessages.push("Teacher email is missing.")
    } else if (!EMAIL_REGEX.test(email)) {
      anomalies.push("INVALID_EMAIL")
      errorMessages.push(`Malformed email format: "${email}"`)
    } else if (existingEmails.has(email)) {
      anomalies.push("DUPLICATE_IN_DB")
      errorMessages.push("Teacher email already exists in database (Already Uploaded).")
    } else if (duplicateEmailsInCSV.has(email)) {
      anomalies.push("DUPLICATE_IN_CSV")
      errorMessages.push("Email appears multiple times in this CSV batch.")
    }

    if (!teacherId) {
      anomalies.push("MISSING_TEACHER_ID")
      errorMessages.push("Teacher Unique ID is missing.")
    } else if (existingTeacherIds.has(teacherId.toLowerCase())) {
      anomalies.push("DUPLICATE_IN_DB")
      errorMessages.push(`Teacher ID "${teacherId}" already exists in database.`)
    } else if (duplicateIdsInCSV.has(teacherId.toLowerCase())) {
      anomalies.push("DUPLICATE_IN_CSV")
      errorMessages.push(`Teacher ID "${teacherId}" appears multiple times in this CSV batch.`)
    }

    if (!password) {
      anomalies.push("MISSING_PASSWORD")
      errorMessages.push("Password is not specified (auto-default will be applied).")
    }

    let status: ValidatedTeacherRow["status"] = "READY"
    if (anomalies.includes("DUPLICATE_IN_DB")) {
      status = "DUPLICATE_DB"
    } else if (anomalies.includes("DUPLICATE_IN_CSV")) {
      status = "DUPLICATE_CSV"
    } else if (anomalies.some((a) => a !== "MISSING_PASSWORD")) {
      status = "ANOMALY"
    }

    return {
      rowId,
      name,
      email,
      teacherId,
      specialization,
      qualification,
      password,
      anomalies,
      status,
      errorMessages,
    }
  })
}

export function autoResolveTeacherRows(
  rows: ValidatedTeacherRow[],
  schoolDomain: string = "school.edu"
): ValidatedTeacherRow[] {
  const currentYear = new Date().getFullYear()
  const usedEmails = new Set<string>()
  const usedIds = new Set<string>()

  for (const r of rows) {
    if (r.email && EMAIL_REGEX.test(r.email) && !r.anomalies.includes("DUPLICATE_IN_CSV")) {
      usedEmails.add(r.email.toLowerCase())
    }
    if (r.teacherId && !r.anomalies.includes("DUPLICATE_IN_CSV")) {
      usedIds.add(r.teacherId.toLowerCase())
    }
  }

  let counter = 100

  return rows.map((row) => {
    let { name, email, teacherId, specialization, qualification, password } = row
    const anomalies: AnomalyType[] = []
    const errorMessages: string[] = []

    if (!name.trim()) {
      name = `Teacher ${counter}`
    }

    if (!teacherId.trim() || row.anomalies.includes("DUPLICATE_IN_CSV") || row.anomalies.includes("DUPLICATE_IN_DB")) {
      do {
        counter++
        teacherId = `TCH-${currentYear}-${counter}`
      } while (usedIds.has(teacherId.toLowerCase()))
      usedIds.add(teacherId.toLowerCase())
    }

    if (!email || !EMAIL_REGEX.test(email) || row.anomalies.includes("DUPLICATE_IN_CSV") || row.anomalies.includes("DUPLICATE_IN_DB")) {
      const cleanSlug = teacherId.toLowerCase().replace(/[^a-z0-9]/g, "")
      let generatedEmail = `${cleanSlug}@faculty.${schoolDomain}`
      let suffix = 1
      while (usedEmails.has(generatedEmail)) {
        generatedEmail = `${cleanSlug}${suffix}@faculty.${schoolDomain}`
        suffix++
      }
      email = generatedEmail
      usedEmails.add(email)
    }

    if (!password || password.trim().length === 0) {
      const idPart = teacherId.replace(/[^a-zA-Z0-9]/g, "")
      password = `Tch@${idPart || currentYear}`
    }

    if (!specialization.trim()) {
      specialization = "General Education"
    }

    if (!qualification.trim()) {
      qualification = "B.Ed."
    }

    return {
      ...row,
      name,
      email,
      teacherId,
      specialization,
      qualification,
      password,
      anomalies,
      errorMessages,
      status: "FIXED",
      isAutoResolved: true,
    }
  })
}

export function generateCredentialsCSV(
  records: Array<{
    name: string
    email: string
    idOrRoll: string
    classOrSubject?: string | null
    password?: string | null
    status?: string
  }>,
  type: "STUDENT" | "TEACHER" = "STUDENT"
): string {
  const headers = type === "STUDENT"
    ? ["Name", "StudentUniqueID", "Email", "Class", "TemporaryPassword", "Status"]
    : ["Name", "TeacherUniqueID", "Email", "Specialization", "TemporaryPassword", "Status"]

  const csvRows = [headers.join(",")]

  for (const r of records) {
    const escapeCsv = (val?: string | null) => {
      const str = val ? String(val).trim() : ""
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    }

    const row = [
      escapeCsv(r.name),
      escapeCsv(r.idOrRoll),
      escapeCsv(r.email),
      escapeCsv(r.classOrSubject || "Unassigned"),
      escapeCsv(r.password || (type === "STUDENT" ? "Student@123" : "Teacher@123")),
      escapeCsv(r.status || "ACTIVE"),
    ]
    csvRows.push(row.join(","))
  }

  return csvRows.join("\r\n")
}
