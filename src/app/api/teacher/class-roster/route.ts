import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { verifySession } from "@/lib/auth/session"
import { classRosterQuerySchema } from "@/lib/validations"
import { verifyTeacherAssignmentAccess, logSecurityEvent } from "@/lib/auth/idor-protection"
import { getActiveAcademicSession } from "@/lib/auth/teacher-authorization"

/**
 * GET /api/teacher/class-roster?classId=...&academicSessionId=...
 * Authenticated Class Roster Retrieval Handler with IDOR Prevention & Generic Errors.
 */
export async function GET(request: NextRequest) {
  const clientIp = request.headers.get("x-forwarded-for") || "127.0.0.1"

  try {
    // 1. Verify User Session & Role
    const session = await verifySession()
    if (!session || !session.isAuth || session.role !== "TEACHER") {
      logSecurityEvent({
        event: "UNAUTHORIZED_ACCESS",
        userId: session?.userId,
        clientIp,
        resource: "/api/teacher/class-roster",
        details: "Unauthenticated or non-teacher session attempt.",
      })
      // Return generic 400 response to prevent role enumeration
      return NextResponse.json({ error: "Invalid request parameters" }, { status: 400 })
    }

    // 2. Extract & Sanitize Request Query Parameters
    const url = new URL(request.url)
    const rawClassId = url.searchParams.get("classId")
    const rawSessionId = url.searchParams.get("academicSessionId")

    // 3. Strict Zod Parsing & Sanitization
    const parseResult = classRosterQuerySchema.safeParse({
      classId: rawClassId,
      academicSessionId: rawSessionId,
    })

    if (!parseResult.success) {
      logSecurityEvent({
        event: "VALIDATION_FAILURE",
        userId: session.userId,
        clientIp,
        resource: "/api/teacher/class-roster",
        details: parseResult.error.issues.map((i: any) => i.message).join("; "),
      })
      // Generic 400 Bad Request error response
      return NextResponse.json({ error: "Invalid request parameters" }, { status: 400 })
    }

    const { classId } = parseResult.data

    // 4. Resolve Active Academic Session
    const activeSession = await getActiveAcademicSession()
    const sessionId = parseResult.data.academicSessionId || activeSession?.id

    if (!sessionId) {
      logSecurityEvent({
        event: "VALIDATION_FAILURE",
        userId: session.userId,
        clientIp,
        resource: "/api/teacher/class-roster",
        details: "No active academic session found.",
      })
      return NextResponse.json({ error: "Invalid request parameters" }, { status: 400 })
    }

    // 5. Live IDOR Verification (Application-Layer Verification)
    const { isAuthorized } = await verifyTeacherAssignmentAccess({
      userId: session.userId,
      classId,
      academicSessionId: sessionId,
    })

    if (!isAuthorized) {
      logSecurityEvent({
        event: "IDOR_ATTEMPT",
        userId: session.userId,
        clientIp,
        resource: `/api/teacher/class-roster?classId=${classId}`,
        details: `Teacher tried accessing unassigned classId=${classId} in sessionId=${sessionId}`,
      })
      // Generic 400 response hides database details and resource existence
      return NextResponse.json({ error: "Invalid request parameters" }, { status: 400 })
    }

    // 6. Query Roster using Active Session Enrollment Boundaries
    const enrollments = await prisma.studentEnrollment.findMany({
      where: {
        classId,
        academicSessionId: sessionId,
        status: "ACTIVE",
      },
      include: {
        student: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        student: { user: { name: "asc" } },
      },
    })

    const roster = enrollments.map((e) => ({
      enrollmentId: e.id,
      studentId: e.student.id,
      name: e.student.user.name,
      email: e.student.user.email,
      classId: e.classId,
    }))

    return NextResponse.json({ success: true, roster }, { status: 200 })
  } catch (error: any) {
    logSecurityEvent({
      event: "VALIDATION_FAILURE",
      clientIp,
      resource: "/api/teacher/class-roster",
      details: error?.message || "Unhandled server exception",
    })
    return NextResponse.json({ error: "Invalid request parameters" }, { status: 400 })
  }
}
