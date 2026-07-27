# Scout

**AI due diligence engine.** Research tools answer _"what is this company?"_ Scout answers **"should I trust this company for my use case?"**

Give it a company name, domain, or URL. It reads official sources and third-party signals, grades the risk across 11 sections, and links every claim back to the evidence it came from.

## Stack

| Layer           | Choice                                                   |
| --------------- | -------------------------------------------------------- |
| Framework       | Next.js 16 (App Router, Turbopack, React 19)             |
| Styling         | Tailwind v4, shadcn/ui (`base-nova`), Base UI primitives |
| AI              | Vercel AI SDK 7 + Azure OpenAI                           |
| Database        | Neon Postgres + Drizzle                                  |
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

Evaluations persist to Postgres and run collectors + Azure section agents in the request's `after()` continuation. `GET /api/v1/health` reports which env vars are still missing.

You need `DATABASE_URL` for create/read. Collectors and section agents also need `FIRECRAWL_API_KEY`, `EXA_API_KEY`, and the three `AZURE_OPENAI_*` vars; without them the API boots and `/api/v1/health` lists what's absent.

### Environment

| Variable                                                          | Needed for   | Purpose                                                                      |
| ----------------------------------------------------------------- | ------------ | ---------------------------------------------------------------------------- |
| `DATABASE_URL`                                                    | always       | Neon Postgres connection string. Also read by Drizzle Kit database commands. |
| `FIRECRAWL_API_KEY`                                               | pipeline     | Official-source crawling                                                     |
| `EXA_API_KEY`                                                     | pipeline     | Third-party signal search                                                    |
| `AZURE_OPENAI_API_KEY`                                            | pipeline     | Section agents                                                               |
| `AZURE_OPENAI_ENDPOINT`                                           | pipeline     | Section agents                                                               |
| `AZURE_OPENAI_DEPLOYMENT`                                         | pipeline     | Deployment name, not the underlying model id                                 |
| `AZURE_OPENAI_API_VERSION`                                        | optional     | Defaults inside `lib/azure-openai.ts`                                        |
| `INNGEST_EVENT_KEY` / `INNGEST_SIGNING_KEY`                       | optional     | Reserved for durable jobs; unused by the current `after()` pipeline          |
| `AZURE_RESOURCE_NAME` / `AZURE_API_KEY` / `AZURE_DEPLOYMENT_NAME` | optional     | Read by the AI SDK provider in `lib/ai.ts`, separate from the pipeline above |
| `NEXT_PUBLIC_API_BASE`                                            | optional     | Point the client at a different API origin                                   |
| `SCOUT_RATE_LIMIT_PER_MINUTE`                                     | optional     | Defaults to 5                                                                |
| `SCOUT_DEDUPE_WINDOW_HOURS`                                       | optional     | Defaults to 24                                                               |

## Layout

```
app/
  page.tsx                    landing (full-screen hero + evaluate form)
  report/[id]/page.tsx        report, polled until terminal
  api/v1/evaluations/         POST create, GET poll, GET evidence
  api/v1/health/
components/
  scout/                      report + landing surface
  ui/                         shadcn/ui
  ai-elements/                prompt input, citations, sources, suggestions
lib/
  api/                        fetch client + landing specimen
  contract/                   Zod API + drizzle-orm/zod row schemas
  db/                         Drizzle schema + client
  evaluations/                store seam, repository, pipeline, DTO mapping
docs/
  PRD.md, PLAN.md, API_CONTRACT.md, FE_HANDOFF.md, ARCHITECTURE_REVIEW.md
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
bun run build          # next build
bun run typecheck      # tsc --noEmit
bun run lint           # eslint
bun run format         # prettier

bun run db:generate    # drizzle-kit generate
bun run db:migrate     # drizzle-kit migrate
bun run db:push        # drizzle-kit push
bun run db:studio      # drizzle-kit studio
```

## Notes for contributors

- **Drizzle is the database layer.** Tables live in `lib/db/schema.ts`; `lib/db/index.ts` exposes the lazy `getDb()` singleton.
- **EvaluationStore** (`lib/evaluations/store`) is the route seam; adapters write through Drizzle. Pipeline writes still call `repository.ts` directly until the event-stream refactor.
- **Contracts** live under `lib/contract/` (Zod + `drizzle-orm/zod` row schemas). `lib/api-types.ts` re-exports them.
- **Blank env vars count as unset.** `lib/env.ts` strips empty strings before validating, so placeholder lines in `.env` disable a capability rather than crashing the process.
- **`components/ai-elements/` is pruned to what's imported.** Pulling a component back from the registry may reintroduce type errors against Base UI v1, and the build typechecks the whole repo.
- **Motion is deliberate.** Shared easing tokens and the `.scout-enter` animation live in `app/globals.css`, and reduced motion is honored throughout. Streaming state animates; repeated navigation does not.
