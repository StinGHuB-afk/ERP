# RISK REGISTER

| Risk ID | Description | Asset | Likelihood (L/M/H) | Impact (L/M/H) | Severity | Evidence | Mitigation/Owner | Status (open/mitigated/accepted) | Accepted by / expiry |
|---|---|---|---|---|---|---|---|---|---|
| RSK-001 | Cross-tenant deletion via direct `archiveUser` ID invocation | Student/Teacher profiles | M | H | P1 | `src/app/actions/archive.actions.ts:25` | Added `getEffectiveTenantId()` check to match user schoolId | mitigated | Auto-remediated |
| RSK-002 | Cross-school substitute assignment | Classes & Timetable | M | H | P1 | `src/app/actions/substitute.actions.ts:49` | Enforced teacher & class `schoolId` validation against active tenant | mitigated | Auto-remediated |
| RSK-003 | Edge proxy bypassing librarian routes | Library catalog & circulation | M | M | P2 | `src/proxy.ts:13,74` | Added `/librarian` to `isProtectedRoute` and config matcher | mitigated | Auto-remediated |
| RSK-004 | Pre-existing ESLint code smell | Code quality / Maintainability | H | L | P3 | `npm run lint` (424 problems) | TypeScript compiler passes clean; linting cleanup scheduled for next refactor cycle | open | Engineering team |
| RSK-005 | Third-party dependency security advisories | Supply chain | M | M | P2 | `npm audit` (35 advisories, 2 critical in proxy-addr) | Update Next.js / framework packages in non-breaking wave | open | DevOps / Lead |
