# Final Enterprise Deployment Checklist

This document serves as a comprehensive, top-to-bottom audit of the enterprise features added to the ERP. Every feature listed here has been physically verified in the current `src` and `prisma` directories to guarantee both backend logic and frontend integration.

## 1. Core Enterprise Modules

- [x] **360° Profiles**
  - **Backend**: `src/app/actions/enterprise.ts` (`getStudent360Profile`)
  - **Frontend Integration**: `src/app/(dashboard)/admin/students/[id]/page.tsx`
  - *Status: Fully implemented. Consolidates academic, transport, health, and timeline data into a single view.*

- [x] **Transport State-Machine**
  - **Backend**: `src/app/actions/enterprise.ts` (`requestTransportChange`, `processTransportRequest`)
  - **Frontend Integration**: `src/components/forms/StudentTransportRequestForm.tsx`, `src/app/(dashboard)/admin/transport/transport-request-actions.tsx`
  - *Status: Fully implemented. Admin workflow handles `PENDING`, `APPROVED`, and `REJECTED` states seamlessly.*

- [x] **Health Records & Clinic Visits**
  - **Backend**: `src/app/actions/enterprise.ts` (`logClinicVisit`, `upsertHealthRecord`)
  - **Frontend Integration**: `src/components/forms/LogClinicVisitForm.tsx`
  - *Status: Fully implemented. Teachers/Admins can successfully log interactions linking directly to a student's health record.*

- [x] **Profile Update Requests (JSON Payloads)**
  - **Backend**: `src/app/actions/enterprise.ts` (`requestProfileUpdate`, `processProfileUpdate`)
  - **Frontend Integration**: `src/components/forms/ProfileUpdateForm.tsx`, `src/app/(dashboard)/teacher/profile-requests/profile-request-actions.tsx`
  - *Status: Fully implemented. Safely stores incoming changes as a stringified JSON payload, extracting and verifying on approval.*

## 2. Architectural Resiliency

- [x] **Soft-Deletes (`isArchived`)**
  - **Backend**: `src/app/actions/archive.actions.ts` (`archiveUser`)
  - **Frontend Integration**: `src/components/modals/ArchiveUserModal.tsx`
  - *Status: Fully implemented. Executed using `prisma.$transaction` to cascade archival across User, Student, and Teacher records without losing history.*

- [x] **Document Proofs (`proofDocumentUrl`)**
  - **Backend**: `prisma/schema.prisma` (`ProfileUpdateRequest`), `src/app/actions/enterprise.ts`
  - **Frontend Integration**: Integrated into `ProfileUpdateForm.tsx` and teacher approval queues.
  - *Status: Fully implemented. Parents can attach documentary evidence for sensitive profile changes.*

- [x] **Substitute Teacher Delegation**
  - **Backend**: `src/app/actions/substitute.actions.ts` (`assignSubstitute`)
  - **Frontend Integration**: `src/components/forms/AssignSubstituteForm.tsx`
  - *Status: Fully implemented. Admins can time-gate substitute assignments for teachers using `validFrom` and `validUntil`.*

## 3. Operational Automation

- [x] **Transport Race Condition Locks**
  - **Backend**: `src/app/actions/enterprise.ts` (Inside `requestTransportChange`)
  - *Status: Fully implemented. Queries for existing `PENDING` transport requests and throws a structured error to block spam submissions.*

- [x] **Clinic-to-Attendance Atomic Transactions**
  - **Backend**: `src/app/actions/enterprise.ts` (Inside `logClinicVisit`)
  - *Status: Fully implemented. If `actionTaken === "SENT_HOME"`, an atomic `prisma.$transaction` ensures the student is marked as `EXCUSED` in the attendance ledger. Reverts if any step fails.*

- [x] **Term Freeze (`isMarksPublished`) Blockers**
  - **Backend**: `src/app/actions/teacher.ts` (Inside `upsertMark`)
  - *Status: Fully implemented. Before saving a mark, the action checks the `AcademicSession.isMarksPublished` flag, cleanly blocking changes to finalized terms.*

---

## Requires Manual Review

*The automated scan verified all core integrations are present, wired to forms, and executing Server Actions correctly. However, the following edge cases and manual deployment steps remain for your review:*

- **Role-Based Redirection Paths**: Verify that if a Teacher tries to access `/admin/transport`, the middleware cleanly redirects them without exposing the UI. 
- **Turso Syncing**: Since `npx prisma db push` fails natively on Windows for Turso SQLite configurations, ensure you continue running `npx tsx scripts/alter-turso.ts` manually prior to any major deployment cutovers.
- **File Upload Storage**: Document proofs (`proofDocumentUrl`) are supported in the database and schema, but you should verify your external blob storage provider (e.g., Vercel Blob or AWS S3) bucket policies are configured securely so unauthorized users cannot scrape PDF proofs.
