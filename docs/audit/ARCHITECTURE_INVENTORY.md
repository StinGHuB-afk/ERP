# ARCHITECTURE INVENTORY

## 1. Languages, Frameworks, Package Managers & Versions
- **Language**: TypeScript 5 (`typescript: ^5`), JavaScript (Node.js runtime)
- **Framework**: Next.js 16.2.6 (App Router, Turbopack support, Server Actions)
- **UI & Components**: React 19.2.4, Tailwind CSS 4 (`@tailwindcss/postcss`, `tailwindcss: ^4`), Lucide React, Radix UI primitives, Base UI (`@base-ui/react`), Sonner (toast notifications), Recharts
- **Package Manager**: npm (lockfile `package-lock.json` present)
- **ORM / Database Adapter**: Prisma 7.8.0 with `@prisma/adapter-libsql` (v7.8.0) and `@libsql/client` (v0.17.3)
- **Authentication & Security**: Jose (`jose: ^6.2.3` for JWTs), Bcryptjs (`bcryptjs: ^3.0.3` for salted password hashing), Custom Constant-Time string comparison (`timingSafeCompare`)
- **Document Generation**: jsPDF (`jspdf: ^4.2.1`), html2canvas (`html2canvas: ^1.4.1`), pdf-lib (`pdf-lib: ^1.17.1`)
- **File Parsing**: PapaParse (`papaparse: ^5.7.0` for CSV handling)

## 2. Architecture & Folder Structure
- **Monorepo / Modular Next.js Monolith**: Single root Next.js App Router application in `src/`.
- **Frontend / Backend Split**:
  - Frontend: `src/app/(auth)/*`, `src/app/(dashboard)/*`, `src/components/*`
  - Backend Server Actions: `src/app/actions/*.ts` (32 action files handling business mutations)
  - Backend API Routes: `src/app/api/*` (4 REST endpoints)
  - Shared Libraries & Data Access: `src/lib/*` (`prisma.ts`, `auth/*`, `db/*`)
  - Database Schema & Migrations: `prisma/schema.prisma`, `prisma/migrations/`, `prisma/seed.ts`

## 3. Database Engine & Relational Schema
- **DB Engine**: SQLite via LibSQL / Turso cloud connection (`DATABASE_URL=libsql://...`).
- **Data Models**:
  - Identity & Tenants: `Tenant` (school tenant), `User`, `TenantModuleConfig`
  - Academics: `Class`, `Section`, `Subject`, `TeacherSubject`, `AcademicSession`, `TimetableEntry`, `Attendance`, `Mark`, `StudentAcademicRecord`
  - Financials: `FeeStructure`, `FeeDiscount`, `StudentFeeConcession`, `Invoice`, `Transaction`
  - Staff / HR: `Teacher`, `TeacherLeave`, `PayrollMonth`, `Payslip`, `TeacherAttendance`
  - Library: `Book`, `BorrowRecord`
  - Operations & Communication: `Alert`, `Notification`, `Announcement`, `SupportTicket`, `TransportRoute`, `TransportVehicle`, `TransportStop`, `StudentTransportAssignment`, `SchoolAsset`

## 4. Authentication & RBAC Model
- **Mechanism**: Encrypted HTTP-only JWT cookie (`session`) verified via `jose`.
- **Roles Discovered**:
  1. `SUPERADMIN`: Multi-tenant operations, school onboarding, system settings.
  2. `ADMIN`: School-level configuration, staff/student CRUD, timetable, fees, promotions.
  3. `TEACHER`: Class & subject-specific operations, attendance, marks, homework/notes, student alerts.
  4. `STUDENT`: Results, attendance view, notes download, learning hub, library OPAC.
  5. `PARENT`: Ward performance, attendance records, alert notifications, fee invoices.
  6. `LIBRARIAN`: Book cataloging, issue/return circulation, fine management.
- **Route Guard**: `src/proxy.ts` (Next.js middleware execution layer) enforces role checking on `/superadmin/*`, `/admin/*`, `/teacher/*`, `/student/*`, and `/parent/*`.
  - *Finding / Note*: `/librarian/*` is missing from `src/proxy.ts` config matcher and role check, exposing librarian pages to unauthenticated/unauthorized direct navigation unless protected by layout guards.

## 5. External Integrations & Storage Providers
- **Storage**: Supabase Storage (`@supabase/supabase-js`) for file uploads (notes, study materials, receipts).
- **Communication & Sinks**: In-app Notification / Alert tables with mock/sandbox messaging fallbacks.

## 6. Dependency & Supply Chain Vulnerabilities (`npm audit`)
- Total vulnerabilities: 35 (2 critical, 23 high, 7 moderate, 3 low)
- Critical: `proxy-addr` (IP spoofing via IPv4-mapped IPv6 trust subnet)
- High: `sharp` (libvips / libheif / librsvg memory vulnerabilities), `source-map-js`, `prisma` dev tools transitive, `shadcn` / `ts-morph`
