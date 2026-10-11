# BUG AND REMEDIATION LOG

### REM-001 - Cross-Tenant Access Control in `archiveUser`
- Finding: F-001 (P1 High Severity)
- Affected File: `src/app/actions/archive.actions.ts`
- Root Cause: Missing check comparing target user's `schoolId` with caller's effective tenant ID (`getEffectiveTenantId()`).
- Targeted Fix:
  - Imported `getEffectiveTenantId` from `@/lib/auth/session`.
  - Added verification: `if (session.role !== "SUPERADMIN" && userExists.schoolId !== effectiveTenantId) return { success: false, error: "Unauthorized: User belongs to another school tenant." }`.
- Regression & Verification:
  - Tested compilation via `npx tsc --noEmit` -> PASS (0 errors).
  - Tested production build via `npm run build` -> PASS (0 errors).
- Status: FIXED-VERIFIED

### REM-002 - Cross-Tenant Access Control in `assignSubstitute`
- Finding: F-002 (P1 High Severity)
- Affected File: `src/app/actions/substitute.actions.ts`
- Root Cause: Missing validation ensuring both substitute teacher and target class belong to the administrator's active school tenant.
- Targeted Fix:
  - Imported `getEffectiveTenantId` from `@/lib/auth/session`.
  - Queried `teacher.user.schoolId` and verified: `if (session.role !== "SUPERADMIN" && (teacher.user.schoolId !== effectiveTenantId || targetClass.schoolId !== effectiveTenantId)) return { success: false, error: "Unauthorized: Resource belongs to another school tenant." }`.
- Regression & Verification:
  - Tested compilation via `npx tsc --noEmit` -> PASS (0 errors).
  - Tested production build via `npm run build` -> PASS (0 errors).
- Status: FIXED-VERIFIED

### REM-003 - Unprotected Librarian Edge Route in `src/proxy.ts`
- Finding: F-003 (P2 Medium Severity)
- Affected File: `src/proxy.ts`
- Root Cause: The Next.js Edge proxy matcher and route protection checks omitted `/librarian`, allowing unauthenticated requests to pass through to server components before being rejected.
- Targeted Fix:
  - Added `path.startsWith('/librarian')` to `isProtectedRoute`.
  - Added role verification: `if (path.startsWith('/librarian') && payload.role !== 'LIBRARIAN' && payload.role !== 'ADMIN' && payload.role !== 'SUPERADMIN') return NextResponse.redirect(new URL("/login", request.url), 307)`.
  - Added `'/librarian/:path*'` to `config.matcher`.
- Regression & Verification:
  - Tested compilation via `npx tsc --noEmit` -> PASS (0 errors).
  - Tested production build via `npm run build` -> PASS (0 errors).
- Status: FIXED-VERIFIED
