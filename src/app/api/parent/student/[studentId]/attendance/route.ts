import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { verifySession } from "@/lib/auth/session"
import { checkIpRateLimit } from "@/lib/auth/rate-limiter"
import { getChildAttendance } from "@/app/actions/parent"

export const dynamic = "force-dynamic"

interface RouteParams {
  params: Promise<{
    studentId: string
  }>
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { studentId } = await params

  // 1. IP Rate Limiting
  const headersList = await headers()
  const ip = headersList.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1"
  const rateLimit = await checkIpRateLimit(`parent-api-${ip}`, 30, 60)

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    )
  }

  // 2. Parent Session Verification
  const session = await verifySession()
  if (!session || session.role !== "PARENT") {
    return NextResponse.json(
      { error: "Unauthorized. Parent session required." },
      { status: 401 }
    )
  }

  // 3. Reusable Parent Authorization Service Call (Live Anti-Enumeration IDOR Check)
  const result = await getChildAttendance(studentId)

  if (result.error || !result.success) {
    // Anti-Enumeration Response: Standardized 403 response to prevent student ID probing
    return NextResponse.json(
      { error: "Access denied or student record not found." },
      { status: 403 }
    )
  }

  return NextResponse.json({
    success: true,
    studentId: result.studentId,
    summary: result.summary,
    records: result.records,
  })
}
