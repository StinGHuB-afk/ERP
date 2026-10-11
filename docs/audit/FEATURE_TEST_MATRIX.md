# FEATURE TEST MATRIX

| Feature | Frontend components | Backend routes/actions | DB entities | Permissions | Integrations | Dependencies | Existing tests | Known failures | Status |
|---|---|---|---|---|---|---|---|---|---|
| Authentication & Session | `login/page.tsx`, `change-password/page.tsx` | `session.ts`, `jwt.ts`, `password-crypto.ts` | `User` | Public / All | Jose, bcryptjs | None | `direct-nav-test.js` | None | complete |
| Multi-tenant Switching | `tenant-switcher.tsx` | `tenant.actions.ts` | `Tenant`, `TenantModuleConfig` | SUPERADMIN / ADMIN | None | None | `test-tenant-actions.ts` | None | complete |
| Student Management | `admin/students/page.tsx`, `[id]/page.tsx` | `student.actions.ts` | `Student`, `User`, `Class`, `Section` | ADMIN | None | Prisma | Smoke test | None | complete |
| Teacher Management | `admin/teachers/page.tsx` | `teacher.actions.ts` | `Teacher`, `User`, `TeacherSubject` | ADMIN | None | Prisma | None | None | complete |
| Attendance Tracking | `teacher/attendance/page.tsx`, `admin/attendance/page.tsx` | `attendance.ts` | `Attendance`, `Student`, `Class` | TEACHER, ADMIN | None | Offline local sync | None | None | complete |
| Marks & Grading | `teacher/marks/page.tsx` | `marks.ts` | `Mark`, `Subject`, `StudentAcademicRecord` | TEACHER, ADMIN | None | Prisma | None | None | complete |
| Fee Management & Invoicing | `admin/finance/page.tsx` | `finance.actions.ts` | `FeeStructure`, `Invoice`, `Transaction` | ADMIN | None | None | None | None | complete |
| Library System | `admin/library/page.tsx`, `librarian/page.tsx`, `student/library/page.tsx` | `library.actions.ts` | `Book`, `BorrowRecord` | LIBRARIAN, ADMIN, STUDENT | None | None | None | None | complete |
| Payroll Management | `admin/payroll/page.tsx` | `payroll.actions.ts` | `PayrollMonth`, `Payslip`, `Teacher` | ADMIN | None | None | None | None | complete |
| Alerts & Notifications | `admin/alerts/page.tsx`, `teacher/alerts/page.tsx`, `student/alerts/page.tsx` | `alert.ts`, `notification.actions.ts` | `Alert`, `Notification` | ADMIN, TEACHER, STUDENT, PARENT | None | None | None | None | complete |
| Learning Hub / Notes | `teacher/notes/page.tsx`, `student/learning-hub/page.tsx` | `notes.ts`, `/api/notes/download/[id]` | `StudyMaterial`, `Subject` | TEACHER, STUDENT | Supabase Storage | None | `test-notes-security.ts` | None | complete |
| At-Risk Student Analytics | `teacher/at-risk/page.tsx` | `at-risk.ts` | `Student`, `Attendance`, `Mark` | TEACHER, ADMIN | None | Recharts | None | None | complete |
| Student Promotions | `admin/promotions/page.tsx` | `promotions.ts` | `Student`, `Class`, `AcademicSession` | ADMIN | None | None | None | None | complete |
| Transport Management | `admin/transport/page.tsx` | `operations.actions.ts` | `TransportRoute`, `TransportVehicle` | ADMIN | None | None | None | None | complete |
| Report Card Verification | `verify/[code]/page.tsx` | `/api/verify-report-card` | `StudentAcademicRecord`, `Student` | Public | QR code / crypto token | None | None | None | complete |
