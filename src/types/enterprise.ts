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
