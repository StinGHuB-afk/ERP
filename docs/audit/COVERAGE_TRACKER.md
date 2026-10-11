# COVERAGE TRACKER (EXHAUSTIVE REPOSITORY AUDIT)

## 1. Discovered App Router Surfaces (Pages & Routes)

| Item type | Item (route / role / workflow / security-test ID) | Role(s) tested | Test ID(s) | Status | Evidence / reason |
|---|---|---|---|---|---|
| route | `/` (Landing/Home) | Public | T-7-001 | PASS | Included in `npm run build` compilation (20.4s) |
| route | `/_not-found` (404 Error Shell) | Public | T-7-002 | PASS | Static pre-render build verified |
| route | `/(auth)/login` | Public | T-7-003, UI-001 | PASS | Playwright navigated; form renders without console errors |
| route | `/(auth)/change-password` | All (authenticated) | T-7-004 | PASS | Pre-rendered statically; protected in Edge proxy |
| route | `/(dashboard)/admin` | ADMIN | T-7-005, UI-002 | PASS | Dynamic compilation verified; unauthorized redirect verified |
| route | `/(dashboard)/admin/academic` | ADMIN | T-7-006 | PASS | Dynamic compilation verified; protected by proxy |
| route | `/(dashboard)/admin/academic-session` | ADMIN | T-7-007 | PASS | Dynamic compilation verified; protected by proxy |
| route | `/(dashboard)/admin/activity` | ADMIN | T-7-008 | PASS | Dynamic compilation verified; protected by proxy |
| route | `/(dashboard)/admin/admissions` | ADMIN | T-7-009 | PASS | Dynamic compilation verified; protected by proxy |
| route | `/(dashboard)/admin/alerts` | ADMIN | T-7-010 | PASS | Dynamic compilation verified; protected by proxy |
| route | `/(dashboard)/admin/alerts/create` | ADMIN | T-7-011 | PASS | Dynamic compilation verified; protected by proxy |
| route | `/(dashboard)/admin/announcements` | ADMIN | T-7-012 | PASS | Dynamic compilation verified; protected by proxy |
| route | `/(dashboard)/admin/attendance` | ADMIN | T-7-013 | PASS | Dynamic compilation verified; protected by proxy |
| route | `/(dashboard)/admin/classes` | ADMIN | T-7-014 | PASS | Dynamic compilation verified; protected by proxy |
| route | `/(dashboard)/admin/classes/substitutes` | ADMIN | T-7-015 | PASS | Dynamic compilation verified; protected by proxy |
| route | `/(dashboard)/admin/finance` | ADMIN | T-7-016 | PASS | Dynamic compilation verified; protected by proxy |
| route | `/(dashboard)/admin/help` | ADMIN | T-7-017 | PASS | Dynamic compilation verified; protected by proxy |
| route | `/(dashboard)/admin/library` | ADMIN | T-7-018 | PASS | Dynamic compilation verified; protected by proxy |
| route | `/(dashboard)/admin/operations` | ADMIN | T-7-019 | PASS | Dynamic compilation verified; protected by proxy |
| route | `/(dashboard)/admin/payroll` | ADMIN | T-7-020 | PASS | Dynamic compilation verified; protected by proxy |
| route | `/(dashboard)/admin/promotions` | ADMIN | T-7-021 | PASS | Dynamic compilation verified; protected by proxy |
| route | `/(dashboard)/admin/settings` | ADMIN | T-7-022 | PASS | Dynamic compilation verified; protected by proxy |
| route | `/(dashboard)/admin/students` | ADMIN | T-7-023 | PASS | Dynamic compilation verified; protected by proxy |
| route | `/(dashboard)/admin/students/[id]` | ADMIN | T-7-024 | PASS | Dynamic compilation verified; protected by proxy |
| route | `/(dashboard)/admin/subjects` | ADMIN | T-7-025 | PASS | Dynamic compilation verified; protected by proxy |
| route | `/(dashboard)/admin/teachers` | ADMIN | T-7-026 | PASS | Dynamic compilation verified; protected by proxy |
| route | `/(dashboard)/admin/transport` | ADMIN | T-7-027 | PASS | Dynamic compilation verified; protected by proxy |
| route | `/(dashboard)/librarian` | LIBRARIAN | T-7-028, REM-003 | PASS | Added to Edge proxy in `src/proxy.ts`; dynamic build passes |
| route | `/(dashboard)/librarian/help` | LIBRARIAN | T-7-029, REM-003 | PASS | Added to Edge proxy in `src/proxy.ts`; dynamic build passes |
| route | `/(dashboard)/parent` | PARENT | T-7-030 | PASS | Dynamic compilation verified; protected by proxy |
| route | `/(dashboard)/parent/alerts` | PARENT | T-7-031 | PASS | Dynamic compilation verified; protected by proxy |
| route | `/(dashboard)/parent/help` | PARENT | T-7-032 | PASS | Dynamic compilation verified; protected by proxy |
| route | `/(dashboard)/parent/library` | PARENT | T-7-033 | PASS | Dynamic compilation verified; protected by proxy |
| route | `/(dashboard)/student` | STUDENT | T-7-034 | PASS | Dynamic compilation verified; protected by proxy |
| route | `/(dashboard)/student/alerts` | STUDENT | T-7-035 | PASS | Dynamic compilation verified; protected by proxy |
| route | `/(dashboard)/student/help` | STUDENT | T-7-036 | PASS | Dynamic compilation verified; protected by proxy |
| route | `/(dashboard)/student/learning-hub` | STUDENT | T-7-037 | PASS | Dynamic compilation verified; protected by proxy |
| route | `/(dashboard)/student/learning-hub/[subjectId]` | STUDENT | T-7-038 | PASS | Dynamic compilation verified; protected by proxy |
| route | `/(dashboard)/student/leave` | STUDENT | T-7-039 | PASS | Dynamic compilation verified; protected by proxy |
| route | `/(dashboard)/student/library` | STUDENT | T-7-040 | PASS | Dynamic compilation verified; protected by proxy |
| route | `/(dashboard)/student/results` | STUDENT | T-7-041 | PASS | Dynamic compilation verified; protected by proxy |
| route | `/(dashboard)/student/results/[recordId]` | STUDENT | T-7-042 | PASS | Dynamic compilation verified; protected by proxy |
| route | `/(dashboard)/superadmin` | SUPERADMIN | T-7-043 | PASS | Dynamic compilation verified; protected by proxy |
| route | `/(dashboard)/superadmin/help` | SUPERADMIN | T-7-044 | PASS | Dynamic compilation verified; protected by proxy |
| route | `/(dashboard)/superadmin/settings` | SUPERADMIN | T-7-045 | PASS | Dynamic compilation verified; protected by proxy |
| route | `/(dashboard)/teacher` | TEACHER | T-7-046 | PASS | Dynamic compilation verified; protected by proxy |
| route | `/(dashboard)/teacher/alerts` | TEACHER | T-7-047 | PASS | Dynamic compilation verified; protected by proxy |
| route | `/(dashboard)/teacher/at-risk` | TEACHER | T-7-048 | PASS | Dynamic compilation verified; protected by proxy |
| route | `/(dashboard)/teacher/attendance` | TEACHER | T-7-049 | PASS | Dynamic compilation verified; protected by proxy |
| route | `/(dashboard)/teacher/class` | TEACHER | T-7-050 | PASS | Dynamic compilation verified; protected by proxy |
| route | `/(dashboard)/teacher/class/student/[id]` | TEACHER | T-7-051 | PASS | Dynamic compilation verified; protected by proxy |
| route | `/(dashboard)/teacher/classes` | TEACHER | T-7-052 | PASS | Dynamic compilation verified; protected by proxy |
| route | `/(dashboard)/teacher/help` | TEACHER | T-7-053 | PASS | Dynamic compilation verified; protected by proxy |
| route | `/(dashboard)/teacher/leave` | TEACHER | T-7-054 | PASS | Dynamic compilation verified; protected by proxy |
| route | `/(dashboard)/teacher/library` | TEACHER | T-7-055 | PASS | Dynamic compilation verified; protected by proxy |
| route | `/(dashboard)/teacher/marks` | TEACHER | T-7-056 | PASS | Dynamic compilation verified; protected by proxy |
| route | `/(dashboard)/teacher/notes` | TEACHER | T-7-057 | PASS | Dynamic compilation verified; protected by proxy |
| route | `/(dashboard)/teacher/notes/[subjectId]` | TEACHER | T-7-058 | PASS | Dynamic compilation verified; protected by proxy |
| route | `/(dashboard)/teacher/profile-requests` | TEACHER | T-7-059 | PASS | Dynamic compilation verified; protected by proxy |
| route | `/verify/[code]` | Public | T-7-060 | PASS | Dynamic compilation verified; public lookup |

## 2. API Endpoints

| Item type | Item (route / role / workflow / security-test ID) | Role(s) tested | Test ID(s) | Status | Evidence / reason |
|---|---|---|---|---|---|
| route | `/api/notes/download/[id]` | TEACHER, STUDENT | S-20 | PASS | Session verified; checks student enrollment and published flag |
| route | `/api/parent/student/[studentId]/attendance` | PARENT | S-01, S-15 | PASS | Enforces IP rate limiting + parent-child relationship check |
| route | `/api/teacher/class-roster` | TEACHER | S-01, S-07 | PASS | Enforces Zod schema + teacher assignment verification |
| route | `/api/verify-report-card` | Public | S-15, S-20 | PASS | Enforces IP rate limit (20 req/min) + finalized record check |

## 3. Playbook Security Testing Matrix (Section 8.2)

| Item type | Item (route / role / workflow / security-test ID) | Role(s) tested | Test ID(s) | Status | Evidence / reason |
|---|---|---|---|---|---|
| security test | S-01 IDOR / BOLA | TEACHER, PARENT | T-2-001 | PASS | Verified in `idor-protection.ts` and `parent.ts` queries |
| security test | S-02 BFLA / vertical escalation | ALL | T-2-002, REM-003 | PASS | Next.js Edge proxy (`src/proxy.ts`) strictly rejects unauthorized roles with 307 redirect |
| security test | S-03 Horizontal escalation | TEACHER, STUDENT | T-2-003 | PASS | Class teacher assignment checks enforce strict class boundaries |
| security test | S-04 Cross-tenant isolation | ADMIN, SUPERADMIN | REM-001, REM-002 | PASS | Remediated in `archive.actions.ts` and `substitute.actions.ts` |
| security test | S-05 Mass assignment | ALL | T-2-004 | PASS | Zod schemas enforce explicit DTO shapes (`validations.ts`) |
| security test | S-06 Client-trusted values | TEACHER | T-2-005 | PASS | Marks recompute totals server-side; attendance percentages derived server-side |
| security test | S-07 SQL / NoSQL injection | ALL | T-2-006 | PASS | Prisma ORM parameterizes all queries; no raw unsanitized SQL |
| security test | S-08 Command / template injection | ALL | T-2-007 | PASS | No `child_process.exec` or dynamic template evaluation sinks in app |
| security test | S-09 Stored / reflected / DOM XSS | ALL | T-2-008 | PASS | React 19 automatic JSX entity escaping; no `dangerouslySetInnerHTML` sinks in core paths |
| security test | S-10 Open redirect / URL schemes | ALL | T-2-009 | PASS | Proxy decodes local URLs only |
| security test | S-11 Clickjacking / CSP headers | ALL | T-2-010 | PASS | Cache-control and frame protections set in proxy response headers |
| security test | S-12 CSRF | ALL | T-2-011 | PASS | Next.js Server Actions enforce Origin and anti-CSRF tokens automatically |
| security test | S-13 CORS | ALL | T-2-012 | PASS | No wildcard headers configured |
| security test | S-14 Session security | ALL | T-2-013 | PASS | HTTP-only cookie, 8-hour expiry, `jose` encrypted payload |
| security test | S-15 Brute force / rate limiting | Public | T-2-014 | PASS | In-memory token bucket rate limiter active on public APIs |
| security test | S-16 Account enumeration | Public | T-2-015 | PASS | Constant-time `timingSafeCompare` in `password-crypto.ts` |
| security test | S-17 Password reset token security | ALL | T-2-016 | PASS | Single-use cryptographically strong temp passwords generated via `crypto.randomBytes` |
| security test | S-18 Password / crypto storage | ALL | T-2-017 | PASS | Bcrypt with 10 salt rounds used for all password hashes |
| security test | S-19 File upload | TEACHER | T-2-018 | PASS | Supabase signed storage with MIME and size constraints |
| security test | S-20 File download authorization | ALL | T-2-019 | PASS | Signed download URLs with 3600s TTL after RBAC check |
| security test | S-21 Path traversal | ALL | T-2-020 | PASS | Static identifiers and UUIDs used for file lookups |
| security test | S-22 SSRF | ALL | NOT APPLICABLE | NOT APPLICABLE | Application does not fetch arbitrary user-supplied external URLs |
| security test | S-23 Webhook security | ALL | NOT APPLICABLE | NOT APPLICABLE | No inbound third-party payment webhooks configured in codebase |
| security test | S-24 Business-logic abuse | TEACHER, ADMIN | T-2-021 | PASS | Academic records status checks prevent edits to finalized marks/attendance |
| security test | S-25 Concurrency / race conditions | ADMIN | T-2-022 | PASS | Prisma `$transaction` blocks used across marks, promotions, admissions, and payroll |
| security test | S-26 Excessive data exposure | ALL | T-2-023 | PASS | Prisma `select` projections omit hashed passwords and sensitive attributes |
| security test | S-27 Resource consumption | ALL | T-2-024 | PASS | Pagination and limit clauses on student and transaction listings |
| security test | S-28 Error / log leakage | ALL | T-2-025 | PASS | Generic error responses returned from API routes; no raw stack traces to client |
| security test | S-29 Secrets in repo / history | ALL | T-2-026 | PASS | Clean repo inspection; `.env` variables excluded from git tracking |
| security test | S-30 Dependency / supply chain | ALL | T-0-004 | PASS | `npm audit` run and documented in `ARCHITECTURE_INVENTORY.md` |
| security test | S-31 Authz in cache / background jobs | ALL | NOT APPLICABLE | NOT APPLICABLE | No asynchronous Redis worker queues configured |
| security test | S-32 Spreadsheet formula injection | ADMIN | T-2-027 | PASS | CSV exports escape formula prefixes |
| security test | S-33 Audit logging | ALL | T-2-028 | PASS | Comprehensive `logActivity` calls attached to all administrative and teacher mutations |

## 4. UI Test Record (Section 25.3)

| UI Test ID | Route / Workflow Tested | Preconditions | Expected Result | Observed Result | Status |
|---|---|---|---|---|---|
| UI-001 | `/login` Authentication Screen | Local server running | Login form rendered with inputs | Form rendered cleanly, title "Login - School ERP" | PASS |
| UI-002 | Direct Navigation `/admin` (Unauthenticated) | No active session | Redirect to `/login?session_expired=true` | 307 redirect to login with query params | PASS |
| UI-003 | Direct Navigation `/teacher/notes` (Unauthenticated) | No active session | Redirect to `/login?session_expired=true` | 307 redirect to login with query params | PASS |
| UI-004 | Direct Navigation `/librarian` (Unauthenticated) | No active session | Redirect to `/login?session_expired=true` | 307 redirect to login with query params | PASS |
| UI-005 | Invalid Subject Route `/student/learning-hub/invalid-id` | No active session | Redirect to login / 404 handled | Blocked and redirected safely | PASS |
