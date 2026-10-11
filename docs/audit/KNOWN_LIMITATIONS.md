# KNOWN LIMITATIONS & DISCLOSURES

## 1. ESLint Static Analysis Debt
- **Status**: UNRESOLVED PRE-EXISTING DEBT
- **Scope**: 424 problems (274 errors, 150 warnings).
- **Details**: Pre-existing debt consisting of `@typescript-eslint/no-explicit-any` usage across UI dialogs, unescaped quote symbols in JSX, and unused imports. Does not inhibit Next.js production builds or TypeScript compilation (`tsc --noEmit` passed with 0 errors).

## 2. Browser E2E Automation Config
- **Status**: UNVERIFIED (Framework present, config omitted)
- **Scope**: Playwright 1.62.1 is installed in `devDependencies`, but `playwright.config.ts` has not been set up for full headless CI execution. Standalone smoke test scripts exist in `smoke-test/`.

## 3. Remote Staging / Production Cloud Services
- **Status**: BLOCKED / PROHIBITED AUTONOMOUSLY
- **Scope**: Live Turso database, Supabase cloud bucket access keys, live SMS/Email gateways.
- **Details**: Tested via mocked/sanitized bounds; live production mutation was prevented under Rule R5.
