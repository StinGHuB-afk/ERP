# PERFORMANCE & RESOURCE REPORT

## 1. Bundle & Build Analysis
- **Build Engine**: Next.js 16.2.6 (Turbopack)
- **Compile Time**: 20.4 seconds (production bundle)
- **Static Page Generation**: 8/8 routes generated in 734ms
- **Route Modes**:
  - Edge Proxy / Middleware: Active on all protected surfaces (`/superadmin`, `/admin`, `/teacher`, `/student`, `/parent`, `/librarian`)
  - Server-Rendered Dynamic (`ƒ`): All role dashboards, API routes, and parameter routes are properly dynamic with zero hydration errors.
  - Static Pre-rendered (`○`): `/_not-found`, `/change-password`

## 2. Database & Query Performance Patterns
- **Database Engine**: LibSQL / Turso cloud SQLite with WASM edge driver (`@libsql/client`).
- **N+1 Avoidance Audit**:
  - `admin/students`: Uses compound `include: { user: true, class: true, enrollments: { include: { academicSession: true, class: true } } }` in a single query.
  - `teacher/class-roster`: Queries `studentEnrollment` joined with `student` and `user` ordered by student name.
  - `promotions`: Batch fetch with `in: studentIds` for enrollments rather than sequential queries.
- **Connection Model**: Stateless HTTP / WebSocket pooling via `@libsql/client`, eliminating connection pool exhaustion on serverless routes.

## 3. Network & Response Latency
- All API routes (`/api/notes/download/[id]`, `/api/parent/student/[studentId]/attendance`, `/api/teacher/class-roster`, `/api/verify-report-card`) enforce strict payload bounds, JSON schemas, and rate limiting (e.g. 20-30 req/min).
