"use server"

import prisma from "@/lib/prisma"
import { verifySession } from "@/lib/auth/session"
import { revalidatePath } from "next/cache"
import { ProfileEventType, TransportRequestStatus, TransportAssignmentStatus, ProfileUpdateStatus } from "@prisma/client"

// ============================================================
// TYPES & INTERFACES
// ============================================================

export interface RequestedProfileData {
  emergencyContactName?: string
  emergencyContactPhone?: string
  emergencyContactRelation?: string
}

export interface RequestProfileUpdateInput {
  studentId: string
  emergencyContactName?: string
  emergencyContactPhone?: string
  emergencyContactRelation?: string
  proofDocumentUrl?: string
}

export interface RequestTransportChangeInput {
  studentId: string
  currentRouteId?: string
  currentRouteName?: string
  requestedRouteId: string
  requestedRouteName: string
  requestedBusNumber?: string
  requestedPickupPoint?: string
  requestedDropPoint?: string
  reason?: string
}

export interface ProcessTransportRequestInput {
  requestId: string
  status: "APPROVED" | "REJECTED"
  rejectionReason?: string
}

export interface LogClinicVisitInput {
  studentId: string
  reason: string
  symptoms?: string
  treatmentGiven?: string
  medicationAdministered?: string
  nurseNotes?: string
  actionTaken?: string
  parentNotified?: boolean
}

export interface UpsertHealthRecordInput {
  studentId: string
  bloodGroup?: string
  allergies?: string
  dailyMedications?: string
  emergencyMedicalProtocol?: string
  chronicConditions?: string
  dietaryRestrictions?: string
  doctorName?: string
  doctorPhone?: string
  insuranceProvider?: string
  insurancePolicyNumber?: string
}

export interface UpdateStudentProfileMetadataInput {
  studentId: string
  emergencyContactName?: string
  emergencyContactPhone?: string
  emergencyContactRelation?: string
  behavioralFlags?: string
}

// ============================================================
// PROFILE TIMELINE ACTIONS
// ============================================================

/**
 * Appends a chronological milestone/event to a student's 360° Profile timeline.
 */
export async function logTimelineEvent(
  studentId: string,
  type: ProfileEventType = "GENERAL",
  title: string,
  description?: string,
  severity?: string,
  metadata?: string,
  explicitActorId?: string
) {
  try {
    const session = await verifySession()
    if (!session || !session.isAuth) {
      return { success: false, error: "Unauthorized: Authentication required." }
    }

    // Role check: Only Staff (TEACHER / ADMIN) can add timeline events manually
    if (session.role !== "ADMIN" && session.role !== "TEACHER") {
      return { success: false, error: "Forbidden: Only authorized staff can record timeline events." }
    }

    const studentExists = await prisma.student.findUnique({ where: { id: studentId } })
    if (!studentExists) {
      return { success: false, error: "Student profile record not found." }
    }

    const actorId = explicitActorId || session.userId

    const event = await prisma.profileTimelineEvent.create({
      data: {
        studentId,
        eventType: type,
        title,
        description: description || null,
        severity: severity || null,
        metadata: metadata || null,
        actorId,
      },
    })

    revalidatePath(`/admin/students/${studentId}`)
    revalidatePath(`/teacher/student/${studentId}`)
    return { success: true, data: event }
  } catch (error: any) {
    console.error("Error in logTimelineEvent:", error)
    return { success: false, error: error.message || "Failed to log timeline event." }
  }
}

// ============================================================
// TRANSPORT WORKFLOW ACTIONS
// ============================================================

/**
 * Creates a new TransportChangeRequest (default status PENDING).
 * Accessible by Student (self), Parent (linked student), or Admin.
 */
export async function requestTransportChange(data: RequestTransportChangeInput) {
  try {
    const session = await verifySession()
    if (!session || !session.isAuth) {
      return { success: false, error: "Unauthorized: Authentication required." }
    }

    const student = await prisma.student.findUnique({
      where: { id: data.studentId },
      include: { user: { select: { id: true } }, transportAssignment: true },
    })

    if (!student) {
      return { success: false, error: "Student record not found." }
    }

    // RBAC Security Validation
    if (session.role === "STUDENT") {
      if (student.userId !== session.userId) {
        return { success: false, error: "Unauthorized: You can only request transport changes for yourself." }
      }
    } else if (session.role === "PARENT") {
      const parent = await prisma.parent.findUnique({ where: { userId: session.userId } })
      if (!parent) {
        return { success: false, error: "Parent profile not found." }
      }

      const relation = await prisma.parentStudent.findUnique({
        where: { parentId_studentId: { parentId: parent.id, studentId: data.studentId } },
      })

      if (!relation) {
        return { success: false, error: "Unauthorized: Student is not linked to your parent account." }
      }
    if (session.role === "TEACHER") {
      return { success: false, error: "Forbidden: Teachers are not authorized to submit transport requests." }
    }
    // ADMIN role passes through automatically

    const existingPendingRequest = await prisma.transportChangeRequest.findFirst({
      where: {
        studentId: data.studentId,
        status: TransportRequestStatus.PENDING,
      },
    })
    if (existingPendingRequest) {
      return { success: false, error: "An active transport request is already pending approval. Please wait for it to be resolved." }
    }

    const currentRouteId = data.currentRouteId || student.transportAssignment?.routeId || null
    const currentRouteName = data.currentRouteName || student.transportAssignment?.routeName || null

    const transportRequest = await prisma.transportChangeRequest.create({
      data: {
        studentId: data.studentId,
        currentRouteId,
        currentRouteName,
        requestedRouteId: data.requestedRouteId,
        requestedRouteName: data.requestedRouteName,
        requestedBusNumber: data.requestedBusNumber || null,
        requestedPickupPoint: data.requestedPickupPoint || null,
        requestedDropPoint: data.requestedDropPoint || null,
        reason: data.reason || null,
        status: TransportRequestStatus.PENDING,
      },
    })

    // Log chronological milestone on student 360 profile
    await prisma.profileTimelineEvent.create({
      data: {
        studentId: data.studentId,
        eventType: ProfileEventType.GENERAL,
        title: "Transport Route Change Requested",
        description: `Requested transition to route ${data.requestedRouteName}. Reason: ${data.reason || "N/A"}`,
        actorId: session.userId,
      },
    })

    revalidatePath("/student/transport")
    revalidatePath("/parent/transport")
    revalidatePath("/admin/transport")
    return { success: true, data: transportRequest }
  } catch (error: any) {
    console.error("Error in requestTransportChange:", error)
    return { success: false, error: error.message || "Failed to submit transport change request." }
  }
}

/**
 * Admin-only action to approve or reject a TransportChangeRequest.
 * If APPROVED, executes a prisma.$transaction that updates request status AND overwrites active TransportAssignment simultaneously.
 */
export async function processTransportRequest(
  requestId: string,
  status: "APPROVED" | "REJECTED",
  rejectionReason?: string
) {
  try {
    const session = await verifySession()
    if (!session || !session.isAuth) {
      return { success: false, error: "Unauthorized: Authentication required." }
    }

    // RBAC: Strictly Admin only
    if (session.role !== "ADMIN") {
      return { success: false, error: "Forbidden: Only administrators can process transport requests." }
    }

    const transportRequest = await prisma.transportChangeRequest.findUnique({
      where: { id: requestId },
    })

    if (!transportRequest) {
      return { success: false, error: "Transport request record not found." }
    }

    if (transportRequest.status !== TransportRequestStatus.PENDING) {
      return { success: false, error: `This request has already been processed with status ${transportRequest.status}.` }
    }

    const adminId = session.userId

    if (status === "APPROVED") {
      const result = await prisma.$transaction(async (tx) => {
        // 1. Update request record
        const updatedReq = await tx.transportChangeRequest.update({
          where: { id: requestId },
          data: {
            status: TransportRequestStatus.APPROVED,
            approvingAdminId: adminId,
            processedAt: new Date(),
          },
        })

        // 2. Overwrite active TransportAssignment for the student
        const assignment = await tx.transportAssignment.upsert({
          where: { studentId: transportRequest.studentId },
          update: {
            routeId: transportRequest.requestedRouteId,
            routeName: transportRequest.requestedRouteName,
            busNumber: transportRequest.requestedBusNumber || "Unassigned",
            pickupPoint: transportRequest.requestedPickupPoint || "Default",
            dropPoint: transportRequest.requestedDropPoint || "Default",
            status: TransportAssignmentStatus.ACTIVE,
          },
          create: {
            studentId: transportRequest.studentId,
            routeId: transportRequest.requestedRouteId,
            routeName: transportRequest.requestedRouteName,
            busNumber: transportRequest.requestedBusNumber || "Unassigned",
            pickupPoint: transportRequest.requestedPickupPoint || "Default",
            dropPoint: transportRequest.requestedDropPoint || "Default",
            status: TransportAssignmentStatus.ACTIVE,
          },
        })

        // 3. Log 360° Profile timeline event
        await tx.profileTimelineEvent.create({
          data: {
            studentId: transportRequest.studentId,
            eventType: ProfileEventType.GENERAL,
            title: "Transport Change Approved",
            description: `Assigned to route ${transportRequest.requestedRouteName} (Bus ${transportRequest.requestedBusNumber || "N/A"}).`,
            actorId: adminId,
          },
        })

        return { request: updatedReq, assignment }
      })

      revalidatePath("/admin/transport")
      revalidatePath("/student/transport")
      return { success: true, data: result }
    } else {
      // Status REJECTED
      const result = await prisma.$transaction(async (tx) => {
        const updatedReq = await tx.transportChangeRequest.update({
          where: { id: requestId },
          data: {
            status: TransportRequestStatus.REJECTED,
            approvingAdminId: adminId,
            rejectionReason: rejectionReason || "Request declined by administration.",
            processedAt: new Date(),
          },
        })

        await tx.profileTimelineEvent.create({
          data: {
            studentId: transportRequest.studentId,
            eventType: ProfileEventType.GENERAL,
            title: "Transport Change Declined",
            description: `Request for route ${transportRequest.requestedRouteName} declined. Reason: ${rejectionReason || "N/A"}`,
            actorId: adminId,
          },
        })

        return { request: updatedReq }
      })

      revalidatePath("/admin/transport")
      revalidatePath("/student/transport")
      return { success: true, data: result }
    }
  } catch (error: any) {
    console.error("Error in processTransportRequest:", error)
    return { success: false, error: error.message || "Failed to process transport request." }
  }
}

// ============================================================
// HEALTH & MEDICAL RECORD ACTIONS
// ============================================================

/**
 * Allows a Teacher or Admin to log a HealthClinicVisit.
 * Automatically injects loggedById from the authenticated session.
 */
export async function logClinicVisit(data: LogClinicVisitInput) {
  try {
    const session = await verifySession()
    if (!session || !session.isAuth) {
      return { success: false, error: "Unauthorized: Authentication required." }
    }

    // RBAC: Teacher or Admin only
    if (session.role !== "TEACHER" && session.role !== "ADMIN") {
      return { success: false, error: "Forbidden: Only teachers or school administrators can log clinic visits." }
    }

    const student = await prisma.student.findUnique({
      where: { id: data.studentId },
      include: { healthRecord: true, class: { select: { id: true, teacherId: true } } },
    })

    if (!student) {
      return { success: false, error: "Student record not found." }
    }

    // Ensure HealthRecord exists for the student (creates base record if missing)
    let healthRecordId = student.healthRecord?.id
    if (!healthRecordId) {
      const createdRecord = await prisma.healthRecord.create({
        data: { studentId: data.studentId },
      })
      healthRecordId = createdRecord.id
    }

    const loggedById = session.userId // Automatically injected from session

    const result = await prisma.$transaction(async (tx) => {
      const visit = await tx.healthClinicVisit.create({
        data: {
          healthRecordId: healthRecordId!,
          studentId: data.studentId,
          reason: data.reason,
          symptoms: data.symptoms || null,
          treatmentGiven: data.treatmentGiven || null,
          medicationAdministered: data.medicationAdministered || null,
          nurseNotes: data.nurseNotes || null,
          actionTaken: data.actionTaken || null,
          parentNotified: data.parentNotified ?? false,
          parentNotifiedAt: data.parentNotified ? new Date() : null,
          loggedById,
        },
      })

      if (data.actionTaken === "SENT_HOME") {
        if (!student.class?.id || !student.class?.teacherId) {
          throw new Error("Student class or class teacher is missing, unable to automatically log attendance.")
        }

        const today = new Date()
        today.setHours(0, 0, 0, 0)
        
        await tx.attendance.upsert({
          where: {
            studentId_date: {
              studentId: data.studentId,
              date: today,
            },
          },
          update: {
            status: "EXCUSED",
            remarks: "Automated by Health Module: Sent home from clinic",
          },
          create: {
            studentId: data.studentId,
            classId: student.class.id,
            teacherId: student.class.teacherId,
            date: today,
            status: "EXCUSED",
            remarks: "Automated by Health Module: Sent home from clinic",
          },
        })
      }

      await tx.profileTimelineEvent.create({
        data: {
          studentId: data.studentId,
          eventType: ProfileEventType.HEALTH,
          title: `Clinic Visit: ${data.reason}`,
          description: `Treatment: ${data.treatmentGiven || "Logged"}. Symptoms: ${data.symptoms || "N/A"}.`,
          severity: data.parentNotified ? "HIGH" : "NORMAL",
          actorId: loggedById,
        },
      })

      return visit
    })

    revalidatePath(`/teacher/health/${data.studentId}`)
    revalidatePath(`/admin/health`)
    return { success: true, data: result }
  } catch (error: any) {
    console.error("Error in logClinicVisit:", error)
    return { success: false, error: error.message || "Failed to log clinic visit." }
  }
}

/**
 * Admin/Teacher action to update a student's core HealthRecord.
 */
export async function upsertHealthRecord(data: UpsertHealthRecordInput) {
  try {
    const session = await verifySession()
    if (!session || !session.isAuth) {
      return { success: false, error: "Unauthorized: Authentication required." }
    }

    if (session.role !== "ADMIN" && session.role !== "TEACHER") {
      return { success: false, error: "Forbidden: Only staff members can manage health records." }
    }

    const healthRecord = await prisma.healthRecord.upsert({
      where: { studentId: data.studentId },
      update: {
        bloodGroup: data.bloodGroup,
        allergies: data.allergies,
        dailyMedications: data.dailyMedications,
        emergencyMedicalProtocol: data.emergencyMedicalProtocol,
        chronicConditions: data.chronicConditions,
        dietaryRestrictions: data.dietaryRestrictions,
        doctorName: data.doctorName,
        doctorPhone: data.doctorPhone,
        insuranceProvider: data.insuranceProvider,
        insurancePolicyNumber: data.insurancePolicyNumber,
      },
      create: {
        studentId: data.studentId,
        bloodGroup: data.bloodGroup,
        allergies: data.allergies,
        dailyMedications: data.dailyMedications,
        emergencyMedicalProtocol: data.emergencyMedicalProtocol,
        chronicConditions: data.chronicConditions,
        dietaryRestrictions: data.dietaryRestrictions,
        doctorName: data.doctorName,
        doctorPhone: data.doctorPhone,
        insuranceProvider: data.insuranceProvider,
        insurancePolicyNumber: data.insurancePolicyNumber,
      },
    })

    revalidatePath(`/admin/health`)
    return { success: true, data: healthRecord }
  } catch (error: any) {
    console.error("Error in upsertHealthRecord:", error)
    return { success: false, error: error.message || "Failed to save health record." }
  }
}

// ============================================================
// 360° PROFILE QUERY ACTIONS
// ============================================================

/**
 * Fetches complete 360° Profile for a student (emergency contacts, behavioral flags, health, transport, timeline).
 */
export async function getStudent360Profile(studentId: string) {
  try {
    const session = await verifySession()
    if (!session || !session.isAuth) {
      return { success: false, error: "Unauthorized: Authentication required." }
    }

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        user: { select: { id: true, name: true, email: true, createdAt: true } },
        class: { select: { id: true, name: true } },
        marks: {
          include: { subject: { select: { id: true, name: true, code: true } } },
          orderBy: { createdAt: "desc" },
          take: 30,
        },
        attendance: {
          orderBy: { date: "desc" },
          take: 30,
        },
        academicRecords: {
          include: { academicSession: { select: { id: true, name: true } } },
          orderBy: { createdAt: "desc" },
        },
        healthRecord: {
          include: {
            clinicVisits: {
              orderBy: { visitDate: "desc" },
              take: 10,
              include: { loggedBy: { select: { name: true, role: true } } },
            },
          },
        },
        transportAssignment: true,
        transportChangeRequests: { orderBy: { createdAt: "desc" }, take: 5 },
        profileUpdateRequests: {
          orderBy: { createdAt: "desc" },
          take: 10,
          include: { approvingTeacher: { select: { name: true, role: true } } },
        },
        timelineEvents: {
          orderBy: { createdAt: "desc" },
          take: 25,
          include: { actor: { select: { name: true, role: true } } },
        },
      },
    })

    if (!student) {
      return { success: false, error: "Student profile not found." }
    }

    // RBAC: Check access permissions
    if (session.role === "STUDENT" && student.userId !== session.userId) {
      return { success: false, error: "Unauthorized: You can only access your own profile." }
    }

    if (session.role === "PARENT") {
      const parent = await prisma.parent.findUnique({ where: { userId: session.userId } })
      if (!parent) return { success: false, error: "Parent profile not found." }

      const relation = await prisma.parentStudent.findUnique({
        where: { parentId_studentId: { parentId: parent.id, studentId } },
      })
      if (!relation) {
        return { success: false, error: "Unauthorized: Student is not linked to your parent account." }
      }
    }

    return { success: true, data: student }
  } catch (error: any) {
    console.error("Error in getStudent360Profile:", error)
    return { success: false, error: error.message || "Failed to fetch student 360 profile." }
  }
}

// ============================================================
// PROFILE UPDATE REQUEST WORKFLOW ACTIONS
// ============================================================

/**
 * Submits a ProfileUpdateRequest for emergency contacts or personal info.
 * Accessible by Student (self), Parent (linked child), or Admin.
 */
export async function requestProfileUpdate(data: RequestProfileUpdateInput) {
  try {
    const session = await verifySession()
    if (!session || !session.isAuth) {
      return { success: false, error: "Unauthorized: Authentication required." }
    }

    const student = await prisma.student.findUnique({
      where: { id: data.studentId },
      select: { id: true, userId: true },
    })

    if (!student) {
      return { success: false, error: "Student profile not found." }
    }

    // RBAC check
    if (session.role === "STUDENT") {
      if (student.userId !== session.userId) {
        return { success: false, error: "Unauthorized: You can only submit profile updates for yourself." }
      }
    } else if (session.role === "PARENT") {
      const parent = await prisma.parent.findUnique({ where: { userId: session.userId } })
      if (!parent) return { success: false, error: "Parent profile not found." }

      const relation = await prisma.parentStudent.findUnique({
        where: { parentId_studentId: { parentId: parent.id, studentId: data.studentId } },
      })
      if (!relation) {
        return { success: false, error: "Unauthorized: Student is not linked to your parent account." }
      }
    }

    const payload: RequestedProfileData = {
      ...(data.emergencyContactName !== undefined && { emergencyContactName: data.emergencyContactName.trim() }),
      ...(data.emergencyContactPhone !== undefined && { emergencyContactPhone: data.emergencyContactPhone.trim() }),
      ...(data.emergencyContactRelation !== undefined && { emergencyContactRelation: data.emergencyContactRelation.trim() }),
    }

    const updateRequest = await prisma.profileUpdateRequest.create({
      data: {
        studentId: data.studentId,
        requestedData: JSON.stringify(payload),
        proofDocumentUrl: data.proofDocumentUrl ? data.proofDocumentUrl.trim() : undefined,
        status: ProfileUpdateStatus.PENDING,
      },
    })

    await prisma.profileTimelineEvent.create({
      data: {
        studentId: data.studentId,
        eventType: ProfileEventType.BEHAVIORAL,
        title: "Profile Edit Requested",
        description: `Pending review for contact information updates.`,
        actorId: session.userId,
      },
    })

    revalidatePath(`/admin/students/${data.studentId}`)
    revalidatePath(`/teacher/profile-requests`)
    revalidatePath(`/student`)
    revalidatePath(`/parent`)
    return { success: true, data: updateRequest }
  } catch (error: any) {
    console.error("Error in requestProfileUpdate:", error)
    return { success: false, error: error.message || "Failed to submit profile update request." }
  }
}

/**
 * Teachers or Admins action to approve or reject a pending ProfileUpdateRequest.
 * If APPROVED, executes a prisma.$transaction to update the Student record with the strongly typed JSON payload.
 */
export async function processProfileUpdate(
  requestId: string,
  status: "APPROVED" | "REJECTED",
  rejectionReason?: string
) {
  try {
    const session = await verifySession()
    if (!session || !session.isAuth) {
      return { success: false, error: "Unauthorized: Authentication required." }
    }

    // RBAC: Only Teacher or Admin
    if (session.role !== "TEACHER" && session.role !== "ADMIN") {
      return { success: false, error: "Forbidden: Only teachers or administrators can approve profile update requests." }
    }

    const request = await prisma.profileUpdateRequest.findUnique({
      where: { id: requestId },
    })

    if (!request) {
      return { success: false, error: "Profile update request record not found." }
    }

    if (request.status !== ProfileUpdateStatus.PENDING) {
      return { success: false, error: `This profile update request has already been processed with status ${request.status}.` }
    }

    const teacherUserId = session.userId

    if (status === "APPROVED") {
      // Strongly type the JSON payload parsing
      let parsedData: RequestedProfileData = {}
      try {
        parsedData = JSON.parse(request.requestedData) as RequestedProfileData
      } catch {
        return { success: false, error: "Invalid JSON format in requested data payload." }
      }

      const result = await prisma.$transaction(async (tx) => {
        // 1. Mark request as APPROVED
        const updatedReq = await tx.profileUpdateRequest.update({
          where: { id: requestId },
          data: {
            status: ProfileUpdateStatus.APPROVED,
            approvingTeacherId: teacherUserId,
            processedAt: new Date(),
          },
        })

        // 2. Overwrite Student profile details with strongly typed parsed JSON data
        const updatedStudent = await tx.student.update({
          where: { id: request.studentId },
          data: {
            ...(parsedData.emergencyContactName !== undefined && { emergencyContactName: parsedData.emergencyContactName }),
            ...(parsedData.emergencyContactPhone !== undefined && { emergencyContactPhone: parsedData.emergencyContactPhone }),
            ...(parsedData.emergencyContactRelation !== undefined && { emergencyContactRelation: parsedData.emergencyContactRelation }),
          },
        })

        // 3. Record chronological timeline event
        await tx.profileTimelineEvent.create({
          data: {
            studentId: request.studentId,
            eventType: ProfileEventType.MILESTONE,
            title: "Profile Contact Information Updated",
            description: `Approved emergency contact changes. Contact: ${parsedData.emergencyContactName || "Updated"} (${parsedData.emergencyContactPhone || "N/A"}).`,
            actorId: teacherUserId,
          },
        })

        return { request: updatedReq, student: updatedStudent }
      })

      revalidatePath(`/admin/students/${request.studentId}`)
      revalidatePath(`/teacher/profile-requests`)
      revalidatePath(`/student`)
      revalidatePath(`/parent`)
      return { success: true, data: result }
    } else {
      // Status REJECTED
      const result = await prisma.$transaction(async (tx) => {
        const updatedReq = await tx.profileUpdateRequest.update({
          where: { id: requestId },
          data: {
            status: ProfileUpdateStatus.REJECTED,
            approvingTeacherId: teacherUserId,
            rejectionReason: rejectionReason || "Request declined by school staff.",
            processedAt: new Date(),
          },
        })

        await tx.profileTimelineEvent.create({
          data: {
            studentId: request.studentId,
            eventType: ProfileEventType.BEHAVIORAL,
            title: "Profile Update Request Declined",
            description: `Proposed profile edits declined. Reason: ${rejectionReason || "N/A"}`,
            actorId: teacherUserId,
          },
        })

        return { request: updatedReq }
      })

      revalidatePath(`/admin/students/${request.studentId}`)
      revalidatePath(`/teacher/profile-requests`)
      revalidatePath(`/student`)
      revalidatePath(`/parent`)
      return { success: true, data: result }
    }
  } catch (error: any) {
    console.error("Error in processProfileUpdate:", error)
    return { success: false, error: error.message || "Failed to process profile update request." }
  }
}
