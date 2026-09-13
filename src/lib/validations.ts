import { z } from "zod"

/**
 * XSS Sanitizer Transformer
 * Strips HTML tags, script blocks, inline event handlers, and dangerous control characters.
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== "string") return ""
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "") // Strip script tags & content
    .replace(/<[^>]*>/g, "") // Strip HTML tags
    .replace(/on\w+="[^"]*"/gi, "") // Strip inline double-quoted event handlers
    .replace(/on\w+='[^']*'/gi, "") // Strip inline single-quoted event handlers
    .replace(/javascript:/gi, "") // Strip javascript: URIs
    .replace(/[\0\x08\x09\x1a\n\r]/g, "") // Strip control characters
    .trim()
}

// Custom Zod String with Automatic XSS Sanitization
export const sanitizedString = (minLen = 1, fieldName = "Input") =>
  z.string()
    .transform(sanitizeInput)
    .refine((val) => val.length >= minLen, {
      message: `${fieldName} must be at least ${minLen} characters after sanitization.`,
    })

// UUID / Database ID Validator with Sanitization
export const idSchema = (fieldName = "ID") =>
  z.string()
    .transform(sanitizeInput)
    .refine((val) => /^[a-zA-Z0-9_-]{1,128}$/.test(val), {
      message: `Invalid ${fieldName} format.`,
    })

// ============================================================
// AUTHENTICATION SCHEMAS
// ============================================================

export const loginSchema = z.object({
  email: z.string()
    .transform(sanitizeInput)
    .transform((val) => val.toLowerCase())
    .pipe(z.string().email("Invalid email format")),
  password: z.string().min(8, "Password must be at least 8 characters"),
})

export const signupSchema = z.object({
  name: sanitizedString(2, "Name"),
  email: z.string()
    .transform(sanitizeInput)
    .transform((val) => val.toLowerCase())
    .pipe(z.string().email("Invalid email format")),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["ADMIN", "TEACHER", "STUDENT"]),
})

// ============================================================
// ACADEMIC DATA SCHEMAS
// ============================================================

export const classRosterQuerySchema = z.object({
  classId: idSchema("classId"),
  subjectId: idSchema("subjectId").optional(),
  academicSessionId: idSchema("academicSessionId").optional(),
})

export const studentMarksQuerySchema = z.object({
  classId: idSchema("classId"),
  subjectId: idSchema("subjectId"),
  academicSessionId: idSchema("academicSessionId").optional(),
})

export const markUpsertSchema = z.object({
  studentId: idSchema("studentId"),
  subjectId: idSchema("subjectId"),
  classId: idSchema("classId"),
  examType: sanitizedString(1, "examType"),
  score: z.coerce.number().min(0).max(100),
  status: z.enum(["DRAFT", "PUBLISHED"]).default("DRAFT"),
})

// Legacy schemas preserved for backward compatibility
export const studentSchema = z.object({
  name: sanitizedString(2, "Name"),
  email: z.string().transform(sanitizeInput).pipe(z.string().email("Invalid email address")),
  classId: idSchema("classId"),
})

export const teacherSchema = z.object({
  name: sanitizedString(2, "Name"),
  email: z.string().transform(sanitizeInput).pipe(z.string().email("Invalid email address")),
})

export const classSchema = z.object({
  name: sanitizedString(2, "Class name"),
  teacherId: idSchema("teacherId").optional(),
})

export const subjectSchema = z.object({
  name: sanitizedString(2, "Subject name"),
  code: sanitizedString(2, "Subject code"),
  teacherId: idSchema("teacherId").optional(),
})

export const markSchema = z.object({
  score: z.coerce.number().min(0, "Score cannot be negative").max(100, "Score cannot exceed 100"),
  studentId: idSchema("studentId"),
  subjectId: idSchema("subjectId"),
  examType: sanitizedString(1, "Exam type"),
  status: z.enum(["DRAFT", "PUBLISHED"]).default("DRAFT"),
})
