# Scout API Contract (v1)

**Audience:** Frontend + Backend  
**Owner (backend):** Staff engineer track in this repo  
**Status:** Frozen for MVP — breaking changes require a `v2` path or explicit FE sync  
**Base URL (local):** `http://localhost:3000`  
**Base URL (prod):** `https://<vercel-app>.vercel.app`

All product APIs live under `/api/v1`.  
`/api/inngest` is internal (Inngest webhook) — **frontend must not call it**.

---

## 1. Conventions

### Content type

- Request/response: `application/json; charset=utf-8`
- No auth headers for MVP

### IDs

- All resource IDs are **UUIDv4 strings**

### Timestamps

- ISO-8601 UTC, e.g. `"2026-07-26T07:54:12.000Z"`

### Confidence

- Integer `0–100` (percent). Never a float.

### Scores

- Overall score: number `0–10` with at most one decimal (e.g. `8.9`)
- Risk levels: `"low" | "medium" | "high" | "unknown"`

### Nullability

- Missing / unknown facts → `null` (not omitted), except where noted
- Empty lists → `[]`

### Error envelope (all 4xx/5xx)

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable message",
    "details": {}
  }
}
```

| HTTP | `error.code` | When |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | Bad body / invalid input |
| 404 | `NOT_FOUND` | Unknown evaluation id |
| 409 | `ALREADY_EXISTS` | Reserved (unused MVP) |
| 429 | `RATE_LIMITED` | Too many evaluates |
| 500 | `INTERNAL_ERROR` | Unexpected server failure |
| 503 | `DEPENDENCY_UNAVAILABLE` | Firecrawl / Exa / Azure down at start |

`details` is optional; for validation it may include `{ "fieldErrors": { "input": "required" } }`.

---

## 2. Shared enums

```ts
type EvaluationStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "partial"; // finished with ≥1 failed section; still usable

type EvaluationPhase =
  | "queued"
  | "resolving_entity"
  | "collecting_official"
  | "collecting_external"
  | "analyzing"
  | "recommending"
  | "done"
  | "failed";

type SectionKey =
  | "executive_summary"
  | "company_overview"
  | "product_overview"
  | "feature_analysis"
  | "community_sentiment"
  | "security_compliance"
  | "pricing_intelligence"
  | "competitor_analysis"
  | "engineering_health"
  | "risk_assessment"
  | "recommendation";

type SectionStatus = "pending" | "running" | "completed" | "failed";

type RecommendationVerdict = "yes" | "no" | "conditional";

type EvidenceSourceType = "official" | "external";

type RiskLevel = "low" | "medium" | "high" | "unknown";

type QualityLevel =
  | "excellent"
  | "good"
  | "average"
  | "fair"
  | "poor"
  | "unknown";

type SentimentLabel = "positive" | "neutral" | "negative" | "mixed";
```

**Section display order (frontend MUST use this order):**

1. `executive_summary`  
2. `company_overview`  
3. `product_overview`  
4. `feature_analysis`  
5. `community_sentiment`  
6. `security_compliance`  
7. `pricing_intelligence`  
8. `competitor_analysis`  
9. `engineering_health`  
10. `risk_assessment`  
11. `recommendation`

---

## 3. Endpoints overview

| Method | Path | FE uses? | Purpose |
| --- | --- | --- | --- |
| `POST` | `/api/v1/evaluations` | Yes | Start a new evaluation |
| `GET` | `/api/v1/evaluations/:id` | Yes | Poll full report state |
| `GET` | `/api/v1/evaluations/:id/evidence` | Yes (optional) | Full evidence list if needed |
| `GET` | `/api/v1/health` | Optional | Connectivity check |
| `POST` | `/api/inngest` | **No** | Inngest only |

---

## 4. `POST /api/v1/evaluations`

Start due diligence. Returns immediately; work continues asynchronously.

### Request

```json
{
  "input": "https://linear.app",
  "context": {
    "useCase": "Replace Jira for a 40-person product team",
    "companySize": "1-50",
    "priorities": ["security", "pricing", "dx"]
  }
}
```

| Field | Type | Required | Rules |
| --- | --- | --- | --- |
| `input` | string | yes | 2–200 chars. Company name, domain, or URL |
| `context` | object | no | Tailors recommendation copy |
| `context.useCase` | string | no | max 500 |
| `context.companySize` | `"1-50" \| "51-200" \| "201-1000" \| "1000+"` | no | |
| `context.priorities` | string[] | no | max 8 items; free-form tags |

### Response `201 Created`

```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "queued",
    "phase": "queued",
    "input": "https://linear.app",
    "normalizedUrl": null,
    "companyName": null,
    "domain": null,
    "createdAt": "2026-07-26T07:54:12.000Z",
    "reportUrl": "/report/550e8400-e29b-41d4-a716-446655440000",
    "pollAfterMs": 2000
  }
}
```

### Caching / dedupe behavior

- If the same `domain` completed within the last **24 hours** and `context` is empty/identical, backend may return that evaluation instead of starting a new job.
- Response shape is identical; FE should always navigate to `reportUrl` / `id`.
- Optional response header: `X-Scout-Cache: HIT | MISS`

### Errors

- `400 VALIDATION_ERROR` — empty/invalid `input`
- `429 RATE_LIMITED` — too many starts from same IP
- `503 DEPENDENCY_UNAVAILABLE` — cannot enqueue job

### Frontend flow

1. Disable CTA / show loading on submit  
2. On `201`, redirect to `/report/{id}`  
3. Begin polling `GET /api/v1/evaluations/:id`

---

## 5. `GET /api/v1/evaluations/:id`

Primary poll endpoint. Returns everything the report page needs in one payload.

### Query params

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| `includeEvidence` | `"summary" \| "none" \| "full"` | `"summary"` | Evidence payload size |

- `summary` — up to 40 evidence items used by findings (recommended for poll)
- `none` — omit `evidence` array (lighter)
- `full` — all evidence (prefer dedicated evidence endpoint for large sets)

### Response `200 OK`

```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "running",
    "phase": "analyzing",
    "input": "https://linear.app",
    "normalizedUrl": "https://linear.app",
    "companyName": "Linear",
    "domain": "linear.app",
    "createdAt": "2026-07-26T07:54:12.000Z",
    "updatedAt": "2026-07-26T07:56:01.000Z",
    "completedAt": null,
    "error": null,
    "progress": {
      "percent": 62,
      "phase": "analyzing",
      "phases": [
        { "key": "resolving_entity", "status": "completed" },
        { "key": "collecting_official", "status": "completed" },
        { "key": "collecting_external", "status": "completed" },
        { "key": "analyzing", "status": "running" },
        { "key": "recommending", "status": "pending" }
      ],
      "sectionsCompleted": 6,
      "sectionsTotal": 11
    },
    "summary": {
      "overallScore": null,
      "verdict": null,
      "confidence": null,
      "headline": null,
      "bestSuitedFor": [],
      "avoidIf": []
    },
    "sections": [
      {
        "key": "company_overview",
        "title": "Company Overview",
        "status": "completed",
        "confidence": 78,
        "updatedAt": "2026-07-26T07:55:40.000Z",
        "error": null,
        "data": { }
      },
      {
        "key": "security_compliance",
        "title": "Security & Compliance",
        "status": "running",
        "confidence": null,
        "updatedAt": "2026-07-26T07:56:01.000Z",
        "error": null,
        "data": null
      },
      {
        "key": "pricing_intelligence",
        "title": "Pricing Intelligence",
        "status": "pending",
        "confidence": null,
        "updatedAt": null,
        "error": null,
        "data": null
      }
    ],
    "findings": [
      {
        "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
        "category": "security",
        "severity": "medium",
        "title": "No public SOC2 report linked",
        "summary": "Security page claims SOC2 but no downloadable report was found.",
        "confidence": 71,
        "evidenceIds": ["a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"],
        "sectionKey": "security_compliance"
      }
    ],
    "evidence": [
      {
        "id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        "sourceType": "official",
        "url": "https://linear.app/security",
        "title": "Security",
        "domain": "linear.app",
        "snippet": "We maintain SOC 2 Type II…",
        "fetchedAt": "2026-07-26T07:55:10.000Z"
      }
    ],
    "poll": {
      "shouldPoll": true,
      "pollAfterMs": 2000,
      "etag": "W/\"running-62-6\""
    }
  }
}
```

### Polling contract (frontend)

| Rule | Value |
| --- | --- |
| Start interval | Use `data.poll.pollAfterMs` (fallback `2000`) |
| Stop when | `data.poll.shouldPoll === false` OR `status` ∈ `completed \| failed \| partial` |
| Backoff | If unchanged for 3 polls, FE may increase to `min(pollAfterMs * 1.5, 8000)` |
| Conditional GET | Send `If-None-Match: {etag}` → `304` with empty body when unchanged |
| Max poll duration | Stop after 8 minutes; show timeout UI; offer retry by creating a new evaluation |

### Status semantics for UI

| `status` | UI |
| --- | --- |
| `queued` / `running` | Progress + section skeletons |
| `completed` | Full report |
| `partial` | Show completed sections + banner for failed ones |
| `failed` | Error state; `data.error.message` |

When `status === "failed"`:

```json
"error": {
  "code": "PIPELINE_FAILED",
  "message": "Could not collect official sources for this domain.",
  "phase": "collecting_official"
}
```

### Top-level `summary` hydration rules

- While running: fields may be `null` / `[]`
- Once `executive_summary` or `recommendation` completes, backend fills `summary`
- FE should prefer `summary` for the sticky header; fall back to section data if needed

---

## 6. `GET /api/v1/evaluations/:id/evidence`

### Query

| Param | Default | Description |
| --- | --- | --- |
| `sourceType` | — | `official` \| `external` filter |
| `limit` | `100` | max `200` |
| `cursor` | — | opaque cursor for pagination |

### Response `200`

```json
{
  "data": {
    "items": [
      {
        "id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        "sourceType": "official",
        "url": "https://linear.app/security",
        "title": "Security",
        "domain": "linear.app",
        "snippet": "We maintain SOC 2 Type II…",
        "fetchedAt": "2026-07-26T07:55:10.000Z"
      }
    ],
    "nextCursor": null
  }
}
```

---

## 7. `GET /api/v1/health`

```json
{
  "data": {
    "ok": true,
    "version": "1.0.0",
    "time": "2026-07-26T07:54:12.000Z"
  }
}
```

---

## 8. Section payloads (`sections[].data`)

When `status !== "completed"`, `data` is `null`.  
When `completed`, `data` matches the schemas below.  
Every section may include optional `claims` for provenance chips.

### Shared claim type

```ts
type Claim = {
  id: string;
  text: string;
  confidence: number; // 0-100
  evidenceIds: string[];
};
```

### `executive_summary`

```ts
type ExecutiveSummaryData = {
  overallScore: number; // 0-10
  verdict: RecommendationVerdict;
  confidence: number;
  headline: string;
  bestSuitedFor: string[];
  avoidIf: string[];
  highlights: string[]; // 3-5 bullets
  claims: Claim[];
};
```

### `company_overview`

```ts
type CompanyOverviewData = {
  founded: string | null;       // year or date string
  hq: string | null;
  employees: string | null;     // e.g. "200-500"
  funding: string | null;
  investors: string[];
  estimatedArr: string | null;
  customers: string[];
  regions: string[];
  recentGrowth: string | null;
  claims: Claim[];
};
```

### `product_overview`

```ts
type ProductOverviewData = {
  whatTheySell: string;
  primaryCustomers: string[];
  useCases: string[];
  differentiators: string[];
  coreProducts: Array<{ name: string; description: string }>;
  claims: Claim[];
};
```

### `feature_analysis`

```ts
type FeatureAnalysisData = {
  features: Array<{
    name: string;
    present: "yes" | "no" | "limited" | "unknown";
    quality: "excellent" | "good" | "average" | "fair" | "poor" | "unknown";
    notes: string | null;
    evidenceIds: string[];
  }>;
  claims: Claim[];
};
```

### `community_sentiment`

```ts
type CommunitySentimentData = {
  overall: SentimentLabel;
  trend: "improving" | "stable" | "worsening" | "unknown";
  positiveThemes: Array<{ theme: string; examples: string[]; evidenceIds: string[] }>;
  negativeThemes: Array<{ theme: string; examples: string[]; evidenceIds: string[] }>;
  claims: Claim[];
};
```

### `security_compliance`

```ts
type SecurityComplianceData = {
  enterpriseReadiness: number; // 0-100
  certifications: Array<{
    name: string; // SOC2, ISO27001, HIPAA, GDPR...
    status: "available" | "claimed" | "not_found" | "unknown";
    evidenceIds: string[];
  }>;
  controls: Array<{
    name: string; // SSO, SCIM, RBAC, Audit Logs, Encryption...
    status: "supported" | "limited" | "not_found" | "unknown";
    notes: string | null;
    evidenceIds: string[];
  }>;
  concerns: string[];
  incidents: Array<{
    title: string;
    date: string | null;
    summary: string;
    evidenceIds: string[];
  }>;
  claims: Claim[];
};
```

### `pricing_intelligence`

```ts
type PricingIntelligenceData = {
  model: string | null; // seat, usage, hybrid...
  freeTier: string | null;
  plans: Array<{
    name: string;
    price: string | null;
    unit: string | null;
    notes: string | null;
    evidenceIds: string[];
  }>;
  hiddenCosts: string[];
  estimatedAnnualSpend: string | null;
  competitorComparison: Array<{
    competitor: string;
    relativePrice: "cheaper" | "similar" | "more_expensive" | "unknown";
    notes: string | null;
  }>;
  claims: Claim[];
};
```

### `competitor_analysis`

```ts
type CompetitorAnalysisData = {
  competitors: Array<{
    name: string;
    domain: string | null;
    positioning: string | null;
    strengths: string[];
    weaknesses: string[];
    evidenceIds: string[];
  }>;
  featureMatrix: Array<{
    feature: string;
    values: Record<string, "yes" | "no" | "limited" | "unknown">; // key = competitor or subject name
  }>;
  claims: Claim[];
};
```

### `engineering_health`

```ts
type EngineeringHealthData = {
  documentationQuality: QualityLevel;
  apiQuality: QualityLevel;
  sdkMaturity: QualityLevel;
  releaseCadence: string | null;
  statusPage: { present: boolean; url: string | null };
  openSourceSignals: string | null;
  deprecationPolicy: string | null;
  notes: string[];
  claims: Claim[];
};
```

### `risk_assessment`

```ts
type RiskAssessmentData = {
  categories: Array<{
    category:
      | "product"
      | "vendor_lock_in"
      | "security"
      | "scalability"
      | "pricing"
      | "compliance"
      | "company_stability";
    level: RiskLevel;
    rationale: string;
    evidenceIds: string[];
  }>;
  topRisks: Array<{
    title: string;
    severity: RiskLevel;
    summary: string;
    evidenceIds: string[];
  }>; // aim for ≥3
  claims: Claim[];
};
```

### `recommendation`

```ts
type RecommendationData = {
  adopt: RecommendationVerdict;
  confidence: number;
  why: string[];
  caveats: string[];
  bestSuitedFor: string[];
  avoidIf: string[];
  overallScore: number;
  claims: Claim[];
};
```

---

## 9. Provenance rendering rules (FE)

1. For any `evidenceIds: string[]`, resolve against `data.evidence` by `id`.
2. If an id is missing from the poll payload, either hide the chip or fetch `/evidence`.
3. Show confidence next to claims when `confidence < 70` with a muted “inferred” treatment.
4. External vs official: use `sourceType` for badge color/label (`Official` / `Third-party`).
5. Never invent URLs client-side.

---

## 10. Suggested frontend types file

Backend will also publish identical types at:

```
packages/shared/src/api.ts   // or lib/api-types.ts in monorepo MVP
```

Until that lands, FE should copy the types from **this document** into `src/types/scout-api.ts` and treat this file as source of truth.

---

## 11. Mock responses for parallel FE work

Backend will add fixtures (or FE can hardcode):

| Fixture | Where | Use |
| --- | --- | --- |
| Queued / Failed / Running / POST 201 | [`docs/fixtures/README.md`](./fixtures/README.md) | Copy into FE mocks now |
| Completed / Partial | Build from §8 types (+ notes in fixtures README) | Full report polish |

FE can run against mocks with:

```ts
const USE_MOCKS = process.env.NEXT_PUBLIC_USE_API_MOCKS === "true";
```

---

## 12. Ownership split

| Surface | Owner |
| --- | --- |
| `/api/v1/*` routes, Prisma, Inngest, Firecrawl, Exa, Azure agents | **Backend (you)** |
| Landing page, report UI, polling client, section components | **Frontend (friend)** |
| `docs/API_CONTRACT.md` + shared types | Backend owns; FE PRs allowed for clarity |
| Visual design / UX | Frontend |

### Backend delivery order for FE unblocking

1. **Day 0:** This contract + fixtures + stub routes returning fixtures  
2. **Day 1:** Real `POST` + `GET` with progressive section writes (even if agents are thin)  
3. **Day 2:** Full agents + provenance quality  

Frontend can start immediately on mocks; switch `NEXT_PUBLIC_API_BASE` / mocks flag when stub/real API is up.

---

## 13. Example client (FE)

```ts
async function startEvaluation(input: string) {
  const res = await fetch("/api/v1/evaluations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ input }),
  });
  if (!res.ok) throw await res.json();
  return (await res.json()).data as { id: string; reportUrl: string; pollAfterMs: number };
}

async function getEvaluation(id: string, etag?: string) {
  const res = await fetch(`/api/v1/evaluations/${id}?includeEvidence=summary`, {
    headers: etag ? { "If-None-Match": etag } : {},
  });
  if (res.status === 304) return { notModified: true as const };
  if (!res.ok) throw await res.json();
  const json = await res.json();
  return { notModified: false as const, data: json.data, etag: res.headers.get("ETag") };
}
```
