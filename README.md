# Scout

**AI due diligence engine.** Research tools answer _"what is this company?"_ Scout answers **"should I trust this company for my use case?"**

Give it a company name, domain, or URL. It reads official sources and third-party signals, grades the risk across 11 sections, and links every claim back to the evidence it came from.

## Stack

| Layer           | Choice                                                   |
| --------------- | -------------------------------------------------------- |
| Framework       | Next.js 16 (App Router, Turbopack, React 19)             |
| Styling         | Tailwind v4, shadcn/ui (`base-nova`), Base UI primitives |
| AI              | Vercel AI SDK 7 + Azure OpenAI                           |
| Jobs            | Inngest durable functions                                |
| Database        | Neon Postgres                                            |
| Runtime         | Vercel                                                   |
| Package manager | Bun                                                      |

## Getting started

```bash
bun install
cp .env.example .env    # fill in the values below
bun run db:push         # create the tables in your Neon branch
bun run dev
```

The app runs at `http://localhost:3000`.

### Two modes

`SCOUT_API_MODE` decides what the API does behind the same contract:

- **`stub`** (default) — deterministic in-memory pipeline. No keys, no database, no Inngest. A run walks queued → running → completed over ~35s with real sections, findings, and evidence. Use this for frontend work.
- **`live`** — real collectors (Firecrawl, Exa), real Azure agents, persisted to Postgres, orchestrated by Inngest.

`GET /api/v1/health` reports the current mode and, in live mode, exactly which env vars are still missing.

### Running live

```bash
bun run inngest     # Inngest dev server, discovers /api/inngest
bun run dev         # in another terminal
```

Live mode needs `DATABASE_URL`, `FIRECRAWL_API_KEY`, `EXA_API_KEY`, and the three `AZURE_OPENAI_*` vars. Without them the API still boots and `/api/v1/health` lists what's absent.

### Environment

| Variable                                                          | Needed for   | Purpose                                                                      |
| ----------------------------------------------------------------- | ------------ | ---------------------------------------------------------------------------- |
| `SCOUT_API_MODE`                                                  | always       | `stub` or `live`. Defaults to `stub`.                                        |
| `DATABASE_URL`                                                    | live + build | Neon Postgres connection string. Also read by `prisma generate`.             |
| `FIRECRAWL_API_KEY`                                               | live         | Official-source crawling                                                     |
| `EXA_API_KEY`                                                     | live         | Third-party signal search                                                    |
| `AZURE_OPENAI_API_KEY`                                            | live         | Section agents                                                               |
| `AZURE_OPENAI_ENDPOINT`                                           | live         | Section agents                                                               |
| `AZURE_OPENAI_DEPLOYMENT`                                         | live         | Deployment name, not the underlying model id                                 |
| `AZURE_OPENAI_API_VERSION`                                        | live         | Optional; defaults inside `lib/azure-openai.ts`                              |
| `INNGEST_EVENT_KEY` / `INNGEST_SIGNING_KEY`                       | production   | Unset locally; the dev server needs neither                                  |
| `AZURE_RESOURCE_NAME` / `AZURE_API_KEY` / `AZURE_DEPLOYMENT_NAME` | optional     | Read by the AI SDK provider in `lib/ai.ts`, separate from the pipeline above |
| `NEXT_PUBLIC_USE_API_MOCKS`                                       | optional     | `true` serves the frontend from fixtures and never calls the API             |
| `NEXT_PUBLIC_API_BASE`                                            | optional     | Point the client at a different API origin                                   |
| `SCOUT_RATE_LIMIT_PER_MINUTE`                                     | optional     | Defaults to 5                                                                |
| `SCOUT_DEDUPE_WINDOW_HOURS`                                       | optional     | Defaults to 24                                                               |

### Frontend without a backend

Set `NEXT_PUBLIC_USE_API_MOCKS=true` and the client swaps in `lib/api/mocks.ts`, a scripted evaluation that runs queued → running → completed over ~19 seconds against the real polling path. Type `fail` or `partial` into the input to drive those terminal states.

## Layout

```
app/
  page.tsx                    landing (full-screen hero + evaluate form)
  report/[id]/page.tsx        report, polled until terminal
  api/v1/evaluations/         POST create, GET poll, GET evidence
  api/v1/health/
  api/inngest/                Inngest webhook - never call from the client
components/
  scout/                      report + landing surface
  ui/                         shadcn/ui
  ai-elements/                prompt input, citations, sources, suggestions
inngest/
  client.ts
  functions/evaluate-company.ts
lib/
  api/                        fetch client + mock layer
  evaluations/                domain, validation, progress, DTO mapping, store
  api-types.ts                shared contract types
  ai.ts                       Azure provider
docs/
  PRD.md, PLAN.md, API_CONTRACT.md, FE_HANDOFF.md, fixtures/
types/
  scout-api.ts                frontend mirror of the API contract
```

## The report

Eleven sections, always rendered in contract order: executive summary, company overview, product overview, feature analysis, community sentiment, security & compliance, pricing intelligence, competitor analysis, engineering health, risk assessment, recommendation.

Sections stream in as the pipeline resolves them. Each carries its own status, confidence, and error, so a partial report is still a usable one. Confidence below 70 renders as _inferred_. Every `evidenceIds` array resolves against the payload's `evidence[]`; ids that aren't there are dropped rather than faked, and URLs are never constructed client-side.

## API

Contract lives in [`docs/API_CONTRACT.md`](docs/API_CONTRACT.md) and is frozen for the MVP. Breaking changes need a `v2` path.

| Method | Path                               | Purpose                                        |
| ------ | ---------------------------------- | ---------------------------------------------- |
| `POST` | `/api/v1/evaluations`              | Start an evaluation, returns `201` immediately |
| `GET`  | `/api/v1/evaluations/:id`          | Poll full report state                         |
| `GET`  | `/api/v1/evaluations/:id/evidence` | Paginated evidence                             |
| `GET`  | `/api/v1/health`                   | Connectivity check                             |

Polling: use `poll.pollAfterMs` (default 2000ms), send `If-None-Match` once you have an etag, back off x1.5 to a max of 8s after three unchanged responses, and stop when `poll.shouldPoll` is false or `status` is `completed` / `failed` / `partial`. `hooks/use-evaluation.ts` implements all of this.

## Scripts

```bash
bun run dev            # dev server
bun run build          # prisma generate && next build
bun run typecheck      # tsc --noEmit
bun run lint           # eslint
bun run format         # prettier

bun run db:generate    # prisma generate
bun run db:push        # prisma db push
bun run db:studio      # prisma studio

bun run inngest        # local Inngest dev server
```

## Notes for contributors

- **`lib/generated/` is gitignored.** `prisma generate` runs as part of `build`; CI needs `DATABASE_URL` present at build time because `prisma.config.ts` reads it.
- **Two ORMs are installed.** Prisma is the live path (`lib/db.ts`, `lib/evaluations/repository.ts`, `prisma/schema.prisma`). A Drizzle setup (`lib/db/`, `drizzle.config.ts`, `db:drizzle:*` scripts) survives from an earlier spike and is unused. Delete it when someone has a spare minute.
- **`lib/evaluations/store.ts` is stub-mode only.** It is in-memory and does not survive cold starts, which is fine because live mode never touches it.
- **Blank env vars count as unset.** `lib/env.ts` strips empty strings before validating, so placeholder lines in `.env` disable a capability rather than crashing the process.
- **`components/ai-elements/` is pruned to what's imported.** Pulling a component back from the registry may reintroduce type errors against Base UI v1, and the build typechecks the whole repo.
- **Motion is deliberate.** Shared easing tokens and the `.scout-enter` animation live in `app/globals.css`, and reduced motion is honored throughout. Streaming state animates; repeated navigation does not.
