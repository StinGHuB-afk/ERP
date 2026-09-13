# Per-School Onboarding & Provisioning Runbook

> **Operational Standard**: Enterprise Single-Tenant Deployment  
> **Target Stack**: Next.js App Router, Prisma ORM, Turso / libSQL Database

---

## 1. Single-Tenant Architecture Principle

This School ERP strictly adheres to an **operationally isolated, single-tenant deployment model**. Multi-tenant database sharing is **prohibited**.

Each school instance requires:
- **Dedicated Turso Database**: Isolated data store with zero cross-tenant query risk.
- **Dedicated Environment Secrets**: Unique `AUTH_SECRET`, `DATABASE_URL`, and `DATABASE_AUTH_TOKEN`.
- **Isolated Hosting Process**: Dedicated Next.js deployment instance (e.g. Vercel, Railway, or VPS container).

---

## 2. Prerequisites & CLI Setup

Before onboarding a new school, ensure you have installed and authenticated the required toolchains:

```bash
# Verify Node.js version (v20+ required)
node -v

# Verify Turso CLI installation
turso --version

# Authenticate Turso CLI
turso auth login
```

---

## 3. Step-by-Step Provisioning Workflow

### Step 3.1: Provision Isolated Turso Database

Run the Turso CLI to create a brand-new database instance in the closest region to the target school (e.g., `aws-ap-south-1` for India / South Asia):

```bash
# 1. Create dedicated database for the school (slug format: erp-<school-code>)
turso db create erp-stmarys --location aws-ap-south-1

# 2. Retrieve Database URL
turso db show erp-stmarys --url
# Example Output: libsql://erp-stmarys-orgname.turso.io

# 3. Issue persistent Auth Token
turso db tokens create erp-stmarys
# Example Output: eyJhbGciOiJFZERTQSI...
```

---

### Step 3.2: Configure Isolated Environment Secrets

Create a dedicated `.env.production` file for the school deployment target:

```ini
# ==============================================================================
# PER-SCHOOL ISOLATED ENVIRONMENT CONFIGURATION: St. Mary's Academy
# ==============================================================================

NODE_ENV="production"
PORT="3000"

# Turso / libSQL Database Isolation
DATABASE_URL="libsql://erp-stmarys-orgname.turso.io"
DATABASE_AUTH_TOKEN="eyJhbGciOiJFZERTQSI..."

# Cryptographic Session Key (Generate using openssl rand -base64 32)
AUTH_SECRET="e9f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1"

# School Branding & System Identity
NEXT_PUBLIC_SCHOOL_NAME="St. Mary's Academy"
NEXT_PUBLIC_SCHOOL_CODE="STMARYS"
```

---

### Step 3.3: Execute Controlled Schema Deployment

> [!CAUTION]
> **DO NOT** execute `prisma db push` or `prisma migrate deploy` directly against production Turso databases. Use the automated controlled deployment script.

Run the pre-flight validated deployment script:

```bash
npx tsx scripts/deploy-schema.ts
```

**Script Pipeline Actions**:
1. **Local DDL Validation**: Applies raw SQL statements to an isolated in-memory SQLite database to verify syntax before sending network traffic.
2. **Additive Schema Push**: Applies DDL and safe column extensions to the target Turso instance via `@libsql/client`.
3. **Automated Smoke Tests**: Asserts existence of all 15 core domain tables (`User`, `Teacher`, `StudentEnrollment`, `StudentAcademicRecord`, `Mark`, etc.) and database ping connectivity.

---

### Step 3.4: Initial Data Seeding & Admin Account Provisioning

Initialize default school settings and seed administrative credentials:

```bash
npx tsx prisma/seed.ts
```

**Default Credentials Provisioned**:
- **Admin User**: `admin@school.local` / `admin123` (Must change password upon initial login)
- **Active Academic Session**: Configured to current calendar year.

---

### Step 3.5: Post-Deployment Automated Integrity Verification

Run the TypeScript type check and automated smoke tests to confirm deployment readiness:

```bash
# 1. Verify TypeScript compilation
npx tsc --noEmit

# 2. Run post-deployment database smoke test
npx tsx scripts/deploy-schema.ts
```

---

## 4. Operational Handoff Checklist

Before releasing the deployment to school administrators, verify the following checklist:

| Verification Item | Command / Procedure | Expected Status |
| :--- | :--- | :--- |
| **Isolated Database** | `turso db show erp-<school-code>` | Active / Connected |
| **Schema Integrity** | `npx tsx scripts/deploy-schema.ts` | 15/15 Tables Verified |
| **Admin Authentication** | Log in via `/login` with seeded admin account | Successful redirect to `/admin` |
| **Password Change** | Complete forced password update on initial login | `mustChangePassword = 0` |
| **Session Isolation** | Inspect cookie header in browser dev tools | `HttpOnly`, `Secure`, `SameSite=Lax` |

---

## 5. Maintenance & Disaster Recovery

### Database Dump & Backup
To generate a backup dump of the school's Turso database:

```bash
turso db dump erp-stmarys > backups/erp-stmarys-$(date +%Y%m%d).sql
```

### Emergency Schema Re-sync
If schema drift occurs, re-run `scripts/deploy-schema.ts`. All DDL statements use idempotent `CREATE TABLE IF NOT EXISTS` and safe column additions.
