import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { checkIpRateLimit } from "@/lib/auth/rate-limiter"
import { idSchema } from "@/lib/validations"
import { logSecurityEvent } from "@/lib/auth/idor-protection"

/**
 * GET /api/verify-report-card?recordId=...
 * Public QR Code Verification Endpoint with Strict IP Rate-Limiting.
 */
export async function GET(request: NextRequest) {
  const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1"

  // 1. IP Rate Limiting (20 requests per minute to prevent cost exhaustion)
  const rateLimit = await checkIpRateLimit(clientIp, 20, 60)
  if (!rateLimit.allowed) {
    logSecurityEvent({
      event: "UNAUTHORIZED_ACCESS",
      clientIp,
      resource: "/api/verify-report-card",
      details: "Rate limit exceeded on public verification API.",
    })
    return NextResponse.json(
      { error: "Too many verification requests. Please try again later." },
      { 
        status: 429, 
        headers: { "Retry-After": String(rateLimit.resetInSeconds) } 
      }
    )
  }

  // 2. Query Validation
  const url = new URL(request.url)
  const rawRecordId = url.searchParams.get("recordId")

  const parseResult = idSchema("recordId").safeParse(rawRecordId)
  if (!parseResult.success) {
    return NextResponse.json({ error: "Invalid verification parameters" }, { status: 400 })
  }

  const recordId = parseResult.data

  // 3. Database Verification Lookup
  const record = await prisma.studentAcademicRecord.findUnique({
    where: { id: recordId },
    include: {
      student: { include: { user: { select: { name: true } } } },
      academicSession: { select: { name: true } },
    },
  })

  if (!record || record.status !== "FINALIZED") {
    return NextResponse.json({ error: "Invalid verification parameters" }, { status: 400 })
  }

  return NextResponse.json({
    verified: true,
    studentName: record.student.user.name,
    academicSession: record.academicSession?.name,
    finalPercentage: record.finalPercentage,
    finalGrade: record.finalGrade,
    status: record.status,
  })
}
