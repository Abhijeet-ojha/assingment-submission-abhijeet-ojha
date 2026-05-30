#This project is an assignmet and not meant for any use.

# Mini Lead Distribution System

Production-ready mini lead distribution system demonstrating deterministic, concurrency-safe lead allocation.

## Project Overview

- Purpose: Accept incoming leads and assign them to providers deterministically, enforcing per-provider monthly quotas and ensuring no duplicate or partial assignments.
- Deterministic allocation: Mandatory providers are always included; remaining providers are selected from a rotating fair pool (round-robin) persisted in the database so allocation order survives restarts.
- Concurrency-safe design: All allocation and webhook processing run inside serializable database transactions with retry and exponential backoff to avoid race conditions.

## Tech Stack

- Next.js 15 (App Router)
- TypeScript
- PostgreSQL
- Prisma ORM
- TailwindCSS

## Architecture Overview

- `Service` — logical grouping for leads and allocation rules (defines provider pools and mandatory providers).
- `Lead` — incoming lead record; stores contact fields and allocation status.
- `Provider` — recipient of assigned leads; includes `monthlyQuota` and active flag.
- `LeadAssignment` — join table recording which provider received which lead and when.
- `AllocationCursor` — per-service persistent cursor tracking where the fair-pool rotation left off.
- `ProviderMonthlyUsage` — per-month counters used to enforce provider quotas atomically.
- `WebhookEvent` — idempotent record of inbound webhook deliveries, keyed by `idempotencyKey`.

## Allocation Strategy

- Mandatory providers: Per-service configured providers that must be included for every lead when available.
- Round-robin fairness: Remaining slots are filled from a fair provider pool using the persisted `AllocationCursor` offset.
- Persistent cursors: Cursors are updated inside the same transaction that writes lead and assignment records so rotation is durable.
- Quota enforcement: `ProviderMonthlyUsage` rows are consulted and upserted inside the allocation transaction to atomically increment usage and skip exhausted providers.
- Exhausted provider skipping: Providers at quota are skipped during selection; if fewer than the required assignments remain, allocation fails cleanly and atomically.

## Concurrency Strategy

- Serializable transactions: Allocation runs inside PostgreSQL serializable transactions via Prisma to guarantee correctness under concurrency.
- Retry strategy: Serialization failures (`P2034`) are retried with a small exponential backoff to reduce contention.
- Atomic commits: Lead creation, assignment writes, usage counter updates, and cursor updates are committed together — no partial writes on failure.

## Webhook Idempotency

- Idempotency keys: Webhook requests include an `idempotencyKey` stored in `WebhookEvent` with a unique constraint.
- Replay-safe processing: If an `idempotencyKey` is seen again, the stored event is returned and side effects are not re-applied.

## SSE Realtime

- Dashboard clients subscribe to `/api/events` (SSE) and receive `lead.allocated`, `lead.webhook`, `dashboard.refresh` and periodic `ping` events.
- The client `useDashboardEvents` hook handles reconnect with exponential backoff and event parsing.
- Current limitation: SSE uses an in-process emitter and is suitable for single-instance deployments. For multi-instance use Redis Pub/Sub or Postgres LISTEN/NOTIFY.

## Setup (Local)

1. Install dependencies

```bash
npm install
```

2. Generate Prisma client

```bash
npx prisma generate
```

3. Apply migrations and seed the DB (ensure `DATABASE_URL` is set)

```bash
npx prisma migrate dev
npm run prisma:seed
```

4. Start dev server

```bash
npm run dev
```

Environment variables (example):

```
DATABASE_URL="postgresql://user:pass@localhost:5432/lead_distribution?schema=public"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV=development
```

## Testing & QA Commands

Run the provided QA scripts used during validation:

```bash
node scripts/runtimeQA.js        # API smoke + allocation checks
node scripts/concurrencyTest.js  # 10 concurrent lead requests
npm run lint
npm run build
```

## Known Limitations

- SSE is process-local — not suitable for multi-instance without external pub/sub.
- No authentication/authorization in API routes (demo purposes only).
- No audit logging or long-term metrics collection provided.

## Future Improvements

- Add Redis Pub/Sub or Postgres LISTEN/NOTIFY for cross-instance SSE pub/sub.
- Add queue-based allocation or distributed locking to improve scale if needed.
- Add authentication/authorization and audit logs for production deployments.

## Contact / Demo

Include this repository, steps above, and the QA scripts during demo to reproduce allocation, concurrency, and webhook behavior.
