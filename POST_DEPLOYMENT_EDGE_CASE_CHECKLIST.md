# Post-Deployment Edge Case & Verification Checklist

**Status:** 🟢 FULLY VERIFIED & HARDENED  
**Date:** September 22, 2026  
**Environment:** Next.js 16 (App Router), Prisma 7, Turso libSQL Edge Engine, Vercel Serverless  

---

## 1. Executive Summary

This document details the comprehensive edge-case audit, UI hydration verification, security boundary inspection, and deployment sanitization check for the **School ERP System**. All edge cases, hydration rules, and security controls described in past audit reports (`FINAL_REAL_BROWSER_A_TO_Z_SMOKE_TEST_REPORT.md`, `ENTERPRISE_PRODUCTION_AUDIT_REPORT.md`, `DEPLOYMENT_BUILD_FIX_REPORT.md`, `DEPLOYMENT_SANITIZATION_REPORT.md`, `VERCEL_RUNTIME_AUTH_FIX_REPORT.md`, `PRISMA7_VERCEL_BUILD_STABILIZATION_REPORT.md`, and `TURSO_RUNTIME_ENV_SANITIZATION_REPORT.md`) have been scanned against the active codebase, verified, and reinforced.

---

## 2. Comprehensive Edge Case & Security Verification Checklist

### A. File Upload & Storage Lifecycle (>4.5 MB Direct Uploads)
- [x] **Next.js Body Limit Bypass**: Large PDF assets (>4.5 MB up to 10 MB) directly request signed upload URLs via `requestFileUploadUrl` (`src/app/actions/notes.ts`) to upload directly to Supabase storage without hitting Vercel serverless body size limits.
- [x] **Draft State Isolation**: Initial file creation creates records with `status: ContentStatus.DRAFT`. Draft files are hidden from student queries and only become visible after `confirmFileUpload` transitions the record to `status: ContentStatus.PUBLISHED`.
- [x] **Teacher Ownership Enforcement**: `verifyTeacherOwnership` ensures teachers can only upload, update, publish, or delete files for subjects and classes assigned to them in the active academic session.
- [x] **Student Authorization Isolation**: `/api/notes/download/[id]` verifies student enrollment via `prisma.studentEnrollment` and active teaching assignment via `prisma.teachingAssignment`. Enrolled students cannot access content for unassigned classes or draft files.
- [x] **Storage Secret Shielding**: `SUPABASE_SECRET_KEY` is maintained exclusively on the server side and never leaked to client bundles or browser responses.

### B. Finalization & Immutability Locks
- [x] **Double Finalization Prevention**: `finalizeRecord` in `src/app/(dashboard)/teacher/class/student/[id]/actions.ts` explicitly includes the guard `if (existingRecord?.status === "FINALIZED") return { success: false, error: "Record is already finalized and immutable." }`.
- [x] **Remarks & Report Publication Guard**: `saveRemarks` and `publishReport` check `existingRecord?.status === "FINALIZED"` and block modifications on finalized records.
- [x] **Marks Entry Lockdown**: `upsertMark` in `src/app/actions/teacher.ts` queries `studentAcademicRecord` for the active session and returns an error if `status === "FINALIZED"`. `bulkUpdateMarkStatus` blocks bulk status changes if any student record in the batch is finalized.
- [x] **Attendance Entry Lockdown**: `upsertAttendance` and `bulkMarkPresent` in `src/app/actions/attendance.ts` explicitly check `studentAcademicRecord` and block attendance mutation on finalized records.

### C. Authorization & RBAC Boundaries
- [x] **Report Card Route Authorization**: `/student/results/[recordId]` verifies `record.student.userId === session.userId`. Unauthenticated or unauthorized students are blocked from viewing peer transcripts.
- [x] **Class Rank Analytics Integrity**: Class rank calculation in `ReportCardPage` queries peer records filtering exclusively by `status: { in: ["PUBLISHED", "FINALIZED"] }` to prevent incomplete drafts from skewing class rankings.
- [x] **IDOR Protection**: Security event logging (`logSecurityEvent`) traps unauthorized cross-teacher or cross-class access attempts across marks, attendance, and learning hub actions.

---

## 3. UI Hydration & Client-Server Compatibility Checklist

- [x] **Root Layout Hydration Protection**: `src/app/layout.tsx` includes `suppressHydrationWarning` on both `<html>` and `<body>` tags to prevent hydration mismatches caused by browser extensions (e.g. dark mode, Grammarly, password managers) injecting attributes during SSR.
- [x] **Client-Side Date Formatting Shielding**: Added `suppressHydrationWarning` to date rendering containers in client components (`src/components/alerts/alert-card.tsx`, `src/components/dashboard/alert-inbox-list.tsx`, `src/components/dashboard/recent-notices.tsx`) to eliminate client/server locale and timezone string mismatches.
- [x] **Edge Middleware Unauthenticated Interception**: Hardened `src/proxy.ts` and added `src/middleware.ts` to intercept `/admin`, `/teacher`, `/student`, and `/parent` routes at the Edge level, issuing a `307 Temporary Redirect` to `/login` for unauthenticated traffic before hitting Server Components.
- [x] **Role Access Boundary Enforcement**: Edge middleware validates JWT session payloads and redirects unauthorized role navigation (e.g., non-admin accessing `/admin`) back to `/login`.
- [x] **BFCache Security Headers**: Protected routes dynamically receive `Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate`, `Pragma: no-cache`, and `Expires: 0` headers to prevent browser back-button cache exposure post-logout.

---

## 4. Deployment Sanitization & Build Configuration Checklist

- [x] **Production Seed Exclusion**: `tsconfig.json` explicitly excludes `prisma/seed.ts` from compilation (`"exclude": ["node_modules", "prisma/seed.ts"]`), eliminating build failures on Next.js deployment pipelines.
- [x] **Turso Environment Token Barrier**: `scripts/test-turso.ts` enforces non-dummy token validation, intercepting placeholder strings (`PASTE`, `EXISTING`, `TOKEN`) before executing network operations against the Turso libSQL edge.
- [x] **Edge-Compatible Database Client**: `src/lib/prisma.ts` initializes `PrismaLibSql` from `@prisma/adapter-libsql` with `@libsql/client`, removing native C++ bindings (`better-sqlite3`) to guarantee Vercel Serverless and Edge compatibility.
- [x] **Clean `.gitignore` Coverage**: `.gitignore` excludes `*.log`, `dev.db-journal`, `.env*`, `.next`, and temporary build artifacts while retaining tracked `prisma/dev.db` for demo environments.
- [x] **Prisma 7 Schema Sanitization**: `prisma.config.ts` adheres to Prisma 7 standards by referencing `DATABASE_URL` without deprecated top-level `engine` or `adapter` properties.

---

## 5. Summary of Patches Applied in this Verification Cycle

| File / Component | Type of Patch | Rationale / Detail |
| :--- | :--- | :--- |
| [`src/proxy.ts`](file:///d:/ERP/school-erp-marksheet/school-erp-marksheet/src/proxy.ts) | **Edge Security & Routing** | Injected explicit `307 Temporary Redirect` to `/login` for unauthenticated requests on protected routes (`/admin`, `/teacher`, `/student`, `/parent`), added role boundary validation, and preserved BFCache headers. |
| [`src/middleware.ts`](file:///d:/ERP/school-erp-marksheet/school-erp-marksheet/src/middleware.ts) | **Edge Entrypoint Patch [NEW]** | Created standard Next.js `middleware.ts` entrypoint re-exporting `proxy` handler to guarantee edge execution across Next.js 16 build variants. |
| [`src/app/layout.tsx`](file:///d:/ERP/school-erp-marksheet/school-erp-marksheet/src/app/layout.tsx) | **UI Hydration Patch** | Added `suppressHydrationWarning` to `<html>` and `<body>` tags to prevent SSR hydration warnings from browser extension attribute mutations. |
| [`src/components/alerts/alert-card.tsx`](file:///d:/ERP/school-erp-marksheet/school-erp-marksheet/src/components/alerts/alert-card.tsx) | **UI Hydration Patch** | Added `suppressHydrationWarning` to date/time display div to prevent SSR vs client timezone string mismatches. |
| [`src/components/dashboard/alert-inbox-list.tsx`](file:///d:/ERP/school-erp-marksheet/school-erp-marksheet/src/components/dashboard/alert-inbox-list.tsx) | **UI Hydration Patch** | Added `suppressHydrationWarning` to date formatting timestamp container. |
| [`src/components/dashboard/recent-notices.tsx`](file:///d:/ERP/school-erp-marksheet/school-erp-marksheet/src/components/dashboard/recent-notices.tsx) | **UI Hydration Patch** | Added `suppressHydrationWarning` to announcement date badge. |

---
*Verification completed with zero errors and clean type-checking.*
