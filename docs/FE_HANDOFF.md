# Frontend handoff — Scout

You can start UI **now**. Backend will match this contract; no guessing.

## Read these

1. [`API_CONTRACT.md`](./API_CONTRACT.md) — full API + TypeScript shapes  
2. [`fixtures/README.md`](./fixtures/README.md) — copy/paste mock JSON  

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

Do **not** call `/api/inngest`.

## Local mocks

```ts
const USE_MOCKS = process.env.NEXT_PUBLIC_USE_API_MOCKS === "true";
```

Copy fixtures from `docs/fixtures/README.md` into your mock layer.  
When stub/live API is up, point at the shared Vercel preview and set `USE_MOCKS=false`.

## Types

Copy enums + section `data` types from API_CONTRACT §2 and §8 into e.g. `src/types/scout-api.ts`.  
Backend will later publish the same shapes as `lib/api-types.ts`.

## Questions / contract changes

Ping backend before shipping breaking assumptions. Additive fields are fine; renames/removals need sync.
