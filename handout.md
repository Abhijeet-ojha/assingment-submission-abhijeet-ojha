## Engineering Logbook — Concise Journal

This file summarizes the implementation, runtime QA, and production-polish steps for the lead distribution system.

### Purpose
Deterministic, concurrency-safe lead allocation: accept leads, assign exactly N providers per service (mandatory + fair pool), enforce monthly quotas, and ensure idempotent webhook and realtime dashboard behavior.

### Tech stack
- Next.js 15, TypeScript, PostgreSQL, Prisma, TailwindCSS.

### Core model concepts
- `Service`, `Lead`, `Provider`, `LeadAssignment`, `AllocationCursor`, `ProviderMonthlyUsage`, `WebhookEvent`.

### Allocation summary
- Mandatory providers + fair pool (round-robin using `AllocationCursor`).
- Skip providers at quota; fail atomically if required assignments cannot be satisfied.
- All allocation writes (lead, assignments, usage, cursor) occur inside a serializable transaction.

### Concurrency and transactions
- Use serializable Prisma transactions; retry on serialization failures (`P2034`) with exponential backoff.
- Increased retries and backoff during QA reduced transient conflicts and eliminated internal-server errors under 10x concurrency.

### Webhooks and SSE
- Webhooks use an `idempotencyKey` with a DB unique constraint to ensure idempotent handling.
- SSE (`/api/events`) emits `lead.allocated`, `dashboard.refresh`, and `ping`. The emitter is process-local; swap to Redis/PG LISTEN for multi-instance.

### Runtime QA (high level)
- Migration: manual apply of one migration required for shadow DB; `npx prisma migrate resolve --applied` used after applying SQL.
- Smoke tests: lead create, dashboard, webhook, SSE validated; standardized `{ success, data?, error? }` envelopes used.
- Allocation: single lead → exactly 3 assignments; cursor and usage updated correctly.
- Concurrency: 10 simultaneous requests exercised; added retry/backoff eliminated server errors and preserved invariants.

### Fixes applied
- `lib/allocation.ts`: import `Prisma` at runtime; use transaction-scoped client to reload created records; add retry/backoff tuning.
- `tsconfig.json`: removed invalid key blocking `next build`.
- Added QA scripts: `scripts/runtimeQA.js`, `scripts/concurrencyTest.js`, `scripts/inspectState.js`.

### Commands (quick)
```bash
npm install
npx prisma generate
npx prisma migrate dev
npm run prisma:seed
npm run dev


node scripts/runtimeQA.js
node scripts/concurrencyTest.js
npm run lint
npm run build
```

### Known limitations
- SSE is in-process (single node). Replace with Redis or PG LISTEN/NOTIFY for horizontal scaling.
- Serializable transactions + retries work well but need tuning for very high contention.

### Next steps (optional)
- Run longer stress tests (100+ concurrent requests) and collect metrics.
- Add a deployment checklist / Dockerfile and minimal CI steps for demo deployment.

---

Concise summary retained: allocation invariants, transaction strategy, concurrency fixes, webhook idempotency, and QA commands.
- Document deployment and testing steps after the app passes local checks.

## Prisma browser runtime issue — fix applied

- Symptom: runtime error "PrismaClient is unable to be run in the browser" when loading the `app/test-tools` page. The browser bundle included Prisma because a client component imported server-side modules.
- Root cause: `app/test-tools/page.tsx` (and other client pages) imported `serviceLabels` from `lib/allocation.ts`. `lib/allocation.ts` imports `@prisma/client` and `prisma` making it server-only; importing it into a client component pulled Prisma into the browser build.

### Fix implemented
- Remove server-only imports from client components and provide a client-safe labels module:
	- Added `lib/service-labels.ts` (client-safe) and moved simple label data there.
	- Updated `lib/allocation.ts` to import `serviceLabels` from `lib/service-labels` (server still uses labels but no client imports into server-only file cause risk).
	- Updated client components to import from `lib/service-labels` instead of `lib/allocation`.

### Files changed
- Added: `lib/service-labels.ts`
- Updated: `lib/allocation.ts` (use `service-labels`)
- Updated client pages: `app/test-tools/page.tsx`, `app/request-service/page.tsx`, `app/dashboard/page.tsx`
- Added test API routes: `app/api/test/concurrency/route.ts`, `app/api/test/webhook/route.ts`, `app/api/test/reset/route.ts`

### Imports removed from client bundle
- Removed direct client imports of server-only module: `serviceLabels` import from `@/lib/allocation` (replaced with `@/lib/service-labels`).

### API routes added
- `POST /api/test/concurrency` — server-side concurrent lead generator using `allocateLead`.
- `POST /api/test/webhook` — server-side webhook processor using `processWebhookEvent`.
- `POST /api/test/reset` — server-side quota reset helper that calls webhook processor.

### Validation results
- Runtime: `npm run dev` / visiting `/test-tools` now avoids Prisma browser errors (client bundles no longer include Prisma).
- Build: `npm run lint` and `npm run build` succeed after fixes (production build completed without Prisma in client).

If you want, I can now run a 100+ concurrency stress test and collect metrics, or add a minimal `Dockerfile` and CI steps for deployment.
