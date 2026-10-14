# SECURITY FINDINGS

### F-001 - Cross-Tenant and RBAC Isolation in Direct Archive Action (`archiveUser`)
- Type: Confirmed defect
- Severity/Priority: P1
- Affected: `src/app/actions/archive.actions.ts:17-58`
- Evidence: `archiveUser(userId, role)` accepts any `userId` and verifies only that caller has `ADMIN` or `SUPERADMIN` role. It fails to check if `userExists.schoolId === caller.schoolId`. An Admin from School A can soft-delete staff or students belonging to School B by supplying their `userId`.
- Steps to reproduce:
  1. Authenticate as ADMIN of School Tenant A.
  2. Invoke server action `archiveUser(targetUserId, Role.STUDENT)` where `targetUserId` belongs to School Tenant B.
  3. Target student in School B is marked `isArchived = true`.
- Expected behavior: Rejection with security error `403 Forbidden` / tenant mismatch when caller is not SUPERADMIN and tenant IDs do not match.
- Actual behavior: Deletes user across tenant boundary without isolation check.
- Root cause: Missing tenant boundary validation (`resolveTenantContext` or `userExists.schoolId !== caller.schoolId`).
- Proposed remediation: Fetch caller's tenant context via `getEffectiveTenantId()` / `session.schoolId` and verify `userExists.schoolId === caller.schoolId` unless caller is SUPERADMIN.
- Defect lifecycle status: FIXED-VERIFIED (remediated in REM-001, commit c222ec8)

### F-002 - Missing Tenant Isolation in Substitute Teacher Assignment (`assignSubstitute`)
- Type: Confirmed defect
- Severity/Priority: P1
- Affected: `src/app/actions/substitute.actions.ts:24-80`
- Evidence: `assignSubstitute` verifies Admin role, but does not verify that `teacher.user.schoolId` and `targetClass.schoolId` match the caller's tenant (`session.schoolId` / effective tenant).
- Steps to reproduce:
  1. Authenticate as ADMIN of School A.
  2. Invoke `assignSubstitute({ substituteTeacherId: teacherB_id, classId: classB_id, ... })`.
  3. Assignment is created in DB across schools without tenant validation.
- Expected behavior: Action should enforce that both teacher and class belong to caller's school tenant.
- Actual behavior: Any Admin can cross-assign teachers and classes across different schools.
- Root cause: Missing tenant verification check on `teacher` and `targetClass`.
- Proposed remediation: Enforce tenant match check on `teacher.user.schoolId` and `targetClass.schoolId`.
- Defect lifecycle status: FIXED-VERIFIED (remediated in REM-002, commit c222ec8)

### F-003 - Unprotected Librarian Route in Edge Proxy (`src/proxy.ts`)
- Type: Confirmed defect
- Severity/Priority: P2
- Affected: `src/proxy.ts:7-12`, `src/proxy.ts:70-78`
- Evidence: `src/proxy.ts` matcher covers `/superadmin/:path*`, `/admin/:path*`, `/teacher/:path*`, `/student/:path*`, `/parent/:path*`. It omits `/librarian/:path*`.
- Steps to reproduce:
  1. Navigate to `/librarian` or `/librarian/help` without a session cookie or with an expired session.
  2. Edge proxy allows request to pass to server component without early 307 redirect.
- Expected behavior: `/librarian` routes should be declared in `proxy.ts` matcher and redirected to `/login` if unauthenticated.
- Actual behavior: Unauthenticated requests bypass Edge proxy check (handled only later by page-level code).
- Root cause: Missing `/librarian` entry in `isProtectedRoute` and `config.matcher`.
- Proposed remediation: Add `/librarian` to `isProtectedRoute` and `config.matcher` in `src/proxy.ts`.
- Defect lifecycle status: FIXED-VERIFIED (remediated in REM-003, commit c222ec8)

### F-004 - ESLint Baseline Debt (274 Errors, 150 Warnings)
- Type: Suspected
- Severity/Priority: P3
- Affected: Multiple files across `src/components/*` and `src/app/*`
- Evidence: `npm run lint` yields 424 problems (274 errors, 150 warnings) primarily around `any` types, unescaped quote entities in JSX, and `set-state-in-effect`.
- Defect lifecycle status: OPEN
