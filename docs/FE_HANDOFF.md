# Frontend handoff — Scout

Backend `/api/v1` is live. Point the UI at the app origin (or `NEXT_PUBLIC_API_BASE`).

## Read these

1. [`API_CONTRACT.md`](./API_CONTRACT.md) — full API + TypeScript shapes  
2. [`fixtures/README.md`](./fixtures/README.md) — sample JSON for visual QA  

## What to build

| Page | Behavior |
| --- | --- |
| `/` | Brand **Scout**, one headline, short line, input (name/URL), CTA **Evaluate** |
| `/report/[id]` | Poll `GET /api/v1/evaluations/:id` until `poll.shouldPoll === false` |

### Evaluate flow

1. `POST /api/v1/evaluations` with `{ "input": "..." }` (optional `context`)
2. On `201`, navigate to `data.reportUrl` (or `/report/{data.id}`)
3. Poll using `data.poll.pollAfterMs` (default 2000ms)
4. Send `If-None-Match: {etag}` when you have one; handle `304`
5. Stop when `status` is `completed` | `failed` | `partial`

### Report UI must handle

- Progress bar from `progress.percent` + phase list
- All **11 sections** in contract order (skeleton while `pending`/`running`)
- Sticky header from top-level `summary` (score, verdict, confidence)
- Findings list + evidence chips via `evidenceIds` → `evidence[]`
- `partial`: show completed sections + banner for failed
- `failed`: show `error.message`

## Endpoints you call

- `POST /api/v1/evaluations`
- `GET /api/v1/evaluations/:id?includeEvidence=summary`
- Optional: `GET /api/v1/evaluations/:id/evidence`
- `GET /api/v1/health` — operational missing-config map

## Types

Shared Zod contracts live in `lib/contract/` (re-exported via `lib/api-types.ts`).  
Frontend mirror: `types/scout-api.ts`.

## Questions / contract changes

Ping backend before shipping breaking assumptions. Additive fields are fine; renames/removals need sync.
