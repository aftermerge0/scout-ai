/**
 * Mock layer for `NEXT_PUBLIC_USE_API_MOCKS=true`.
 * Replays a scripted evaluation (queued -> running -> terminal) off a wall clock,
 * so the report page exercises the same polling path as the real API.
 *
 * Fixture data mirrors docs/fixtures/README.md.
 */
import type {
  AnySection,
  Evaluation,
  EvaluationPhase,
  Evidence,
  Finding,
  SectionDataMap,
  SectionKey,
  SectionStatus,
} from "@/types/scout-api"
import { PHASE_ORDER, SECTION_ORDER, SECTION_TITLES } from "@/types/scout-api"

import type { CreatedEvaluation } from "@/types/scout-api"
import type { PollResult } from "./client"

type Scenario = "completed" | "partial" | "failed"

type MockRun = {
  id: string
  input: string
  startedAt: number
  scenario: Scenario
}

/** Section completion timeline in ms from start. */
const SECTION_AT: Record<SectionKey, number> = {
  company_overview: 3000,
  product_overview: 4500,
  feature_analysis: 6000,
  community_sentiment: 7500,
  security_compliance: 9000,
  pricing_intelligence: 10500,
  competitor_analysis: 12000,
  engineering_health: 13500,
  risk_assessment: 15000,
  executive_summary: 16500,
  recommendation: 18000,
}

const PHASE_AT: Record<(typeof PHASE_ORDER)[number], number> = {
  resolving_entity: 1500,
  collecting_official: 4000,
  collecting_external: 7000,
  analyzing: 15000,
  recommending: 18000,
}

const DONE_AT = 19000
const FAIL_AT = 6000

const runs = new Map<string, MockRun>()

function scenarioFor(input: string): Scenario {
  const lower = input.toLowerCase()
  if (lower.includes("fail")) return "failed"
  if (lower.includes("partial")) return "partial"
  return "completed"
}

function uuid(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `mock-${Math.random().toString(16).slice(2)}`
}

export async function mockCreateEvaluation(
  input: string
): Promise<CreatedEvaluation> {
  await delay(400)
  const id = uuid()
  runs.set(id, {
    id,
    input,
    startedAt: Date.now(),
    scenario: scenarioFor(input),
  })
  return {
    id,
    status: "queued",
    phase: "queued",
    input,
    normalizedUrl: null,
    companyName: null,
    domain: null,
    createdAt: new Date().toISOString(),
    reportUrl: `/report/${id}`,
    pollAfterMs: 2000,
  }
}

export async function mockGetEvaluation(
  id: string,
  etag?: string | null
): Promise<PollResult> {
  await delay(250)
  // Direct navigation to a report URL (refresh, shared link): start a fresh run.
  const run =
    runs.get(id) ??
    (() => {
      const created: MockRun = {
        id,
        input: "https://linear.app",
        startedAt: Date.now(),
        scenario: "completed",
      }
      runs.set(id, created)
      return created
    })()

  const data = buildEvaluation(run, Date.now() - run.startedAt)
  if (etag && data.poll.etag === etag) return { notModified: true }
  return { notModified: false, data, etag: data.poll.etag }
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Cheap stand-ins for the backend's entity resolution step. */
function domainOf(input: string): string {
  return input
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0]
    .toLowerCase()
}

function normalizeUrl(input: string): string {
  return `https://${domainOf(input)}`
}

function companyNameOf(input: string): string {
  const label = domainOf(input).split(".")[0].replace(/[-_]/g, " ")
  return label.replace(/\b\w/g, (c) => c.toUpperCase())
}

function buildEvaluation(run: MockRun, elapsed: number): Evaluation {
  const failed = run.scenario === "failed" && elapsed >= FAIL_AT
  const finishedAll = elapsed >= DONE_AT

  const sections = SECTION_ORDER.map((key) =>
    buildSection(run, key, elapsed)
  ) as AnySection[]

  const completedCount = sections.filter((s) => s.status === "completed").length

  const status: Evaluation["status"] = failed
    ? "failed"
    : finishedAll
      ? run.scenario === "partial"
        ? "partial"
        : "completed"
      : elapsed < 1500
        ? "queued"
        : "running"

  const phase: EvaluationPhase = failed
    ? "failed"
    : finishedAll
      ? "done"
      : (PHASE_ORDER.find((p) => elapsed < PHASE_AT[p]) ?? "recommending")

  const percent = failed
    ? 20
    : Math.min(100, Math.round((elapsed / DONE_AT) * 100))

  const summaryReady =
    !failed &&
    sections.find((s) => s.key === "executive_summary")?.status === "completed"

  const terminal = failed || finishedAll

  return {
    id: run.id,
    status,
    phase,
    input: run.input,
    normalizedUrl: elapsed > 1500 ? normalizeUrl(run.input) : null,
    companyName: elapsed > 1500 ? companyNameOf(run.input) : null,
    domain: elapsed > 1500 ? domainOf(run.input) : null,
    createdAt: new Date(run.startedAt).toISOString(),
    updatedAt: new Date().toISOString(),
    completedAt: terminal ? new Date().toISOString() : null,
    error: failed
      ? {
          code: "PIPELINE_FAILED",
          message: "Could not collect official sources for this domain.",
          phase: "collecting_official",
        }
      : null,
    progress: {
      percent,
      phase,
      phases: PHASE_ORDER.map((key) => ({
        key,
        status: phaseStatus(key, elapsed, failed),
      })),
      sectionsCompleted: completedCount,
      sectionsTotal: SECTION_ORDER.length,
    },
    summary: summaryReady
      ? {
          overallScore: 8.4,
          verdict: "conditional",
          confidence: 82,
          headline:
            "Best-in-class issue tracking with thin enterprise compliance evidence.",
          bestSuitedFor: [
            "Product engineering teams under 500 people",
            "Teams replacing Jira for speed",
          ],
          avoidIf: [
            "You need a downloadable SOC 2 report today",
            "You require deep custom workflow automation",
          ],
        }
      : {
          overallScore: null,
          verdict: null,
          confidence: null,
          headline: null,
          bestSuitedFor: [],
          avoidIf: [],
        },
    sections: failed ? [] : sections,
    findings: failed
      ? []
      : FINDINGS.filter((f) => elapsed >= SECTION_AT[f.sectionKey]),
    evidence: failed ? [] : EVIDENCE,
    poll: {
      shouldPoll: !terminal,
      pollAfterMs: terminal ? 0 : 2000,
      etag: `W/"${status}-${percent}-${completedCount}"`,
    },
  }
}

function phaseStatus(
  key: (typeof PHASE_ORDER)[number],
  elapsed: number,
  failed: boolean
): SectionStatus {
  if (failed) {
    if (key === "collecting_official") return "failed"
    return elapsed >= PHASE_AT[key] ? "completed" : "pending"
  }
  if (elapsed >= PHASE_AT[key]) return "completed"
  const index = PHASE_ORDER.indexOf(key)
  const prev = index === 0 ? 0 : PHASE_AT[PHASE_ORDER[index - 1]]
  return elapsed >= prev ? "running" : "pending"
}

function buildSection(
  run: MockRun,
  key: SectionKey,
  elapsed: number
): AnySection {
  const base = {
    key,
    title: SECTION_TITLES[key],
    confidence: null,
    updatedAt: null,
    error: null,
    data: null,
  }

  // In the `partial` scenario one section blows up instead of completing.
  if (run.scenario === "partial" && key === "pricing_intelligence") {
    if (elapsed < SECTION_AT[key]) {
      return { ...base, status: "running" } as AnySection
    }
    return {
      ...base,
      status: "failed",
      updatedAt: new Date().toISOString(),
      error: {
        code: "SECTION_FAILED",
        message: "Pricing page blocked automated fetching (403).",
      },
    } as AnySection
  }

  if (elapsed >= SECTION_AT[key]) {
    return {
      ...base,
      status: "completed",
      confidence: CONFIDENCE[key],
      updatedAt: new Date().toISOString(),
      data: SECTION_DATA[key],
    } as AnySection
  }

  const startsAt = SECTION_AT[key] - 2500
  return {
    ...base,
    status: elapsed >= startsAt ? "running" : "pending",
  } as AnySection
}

const CONFIDENCE: Record<SectionKey, number> = {
  executive_summary: 82,
  company_overview: 78,
  product_overview: 88,
  feature_analysis: 85,
  community_sentiment: 80,
  security_compliance: 70,
  pricing_intelligence: 74,
  competitor_analysis: 68,
  engineering_health: 83,
  risk_assessment: 64,
  recommendation: 82,
}

const EVIDENCE: Evidence[] = [
  {
    id: "e-docs",
    sourceType: "official",
    url: "https://linear.app/docs",
    title: "Docs",
    domain: "linear.app",
    snippet: "API and product documentation.",
    fetchedAt: "2026-07-26T07:55:05.000Z",
  },
  {
    id: "e-security",
    sourceType: "official",
    url: "https://linear.app/security",
    title: "Security",
    domain: "linear.app",
    snippet: "We maintain SOC 2 Type II compliance.",
    fetchedAt: "2026-07-26T07:55:10.000Z",
  },
  {
    id: "e-pricing",
    sourceType: "official",
    url: "https://linear.app/pricing",
    title: "Pricing",
    domain: "linear.app",
    snippet: "Free, Basic $8/user/mo, Business $14/user/mo.",
    fetchedAt: "2026-07-26T07:55:12.000Z",
  },
  {
    id: "e-hn",
    sourceType: "external",
    url: "https://news.ycombinator.com/item?id=1",
    title: "HN discussion",
    domain: "news.ycombinator.com",
    snippet: "Users praise speed and keyboard-first UX.",
    fetchedAt: "2026-07-26T07:55:30.000Z",
  },
  {
    id: "e-reddit",
    sourceType: "external",
    url: "https://reddit.com/r/devops/comments/example",
    title: "Reddit thread",
    domain: "reddit.com",
    snippet: "Seat pricing gets steep past ~200 people.",
    fetchedAt: "2026-07-26T07:55:35.000Z",
  },
  {
    id: "e-g2",
    sourceType: "external",
    url: "https://g2.com/products/linear/reviews",
    title: "G2 reviews",
    domain: "g2.com",
    snippet: "4.6/5 across 400+ reviews; complaints on reporting depth.",
    fetchedAt: "2026-07-26T07:55:40.000Z",
  },
]

const FINDINGS: Finding[] = [
  {
    id: "f1",
    category: "compliance",
    severity: "medium",
    title: "SOC 2 report not publicly linked",
    summary:
      "Security page claims SOC 2 Type II but no downloadable report or trust portal was found.",
    confidence: 71,
    evidenceIds: ["e-security"],
    sectionKey: "security_compliance",
  },
  {
    id: "f2",
    category: "pricing",
    severity: "medium",
    title: "Seat pricing scales poorly past 200 seats",
    summary:
      "No public volume discount tier; third-party threads report steep cost growth at scale.",
    confidence: 66,
    evidenceIds: ["e-pricing", "e-reddit"],
    sectionKey: "pricing_intelligence",
  },
  {
    id: "f3",
    category: "product",
    severity: "low",
    title: "Reporting and analytics are shallow",
    summary:
      "Reviewers repeatedly cite limited custom reporting compared to incumbent trackers.",
    confidence: 74,
    evidenceIds: ["e-g2"],
    sectionKey: "feature_analysis",
  },
  {
    id: "f4",
    category: "vendor_lock_in",
    severity: "high",
    title: "Export path is API-only",
    summary:
      "Bulk migration off the platform depends on the public API; no first-class export tooling documented.",
    confidence: 58,
    evidenceIds: ["e-docs"],
    sectionKey: "risk_assessment",
  },
]

const SECTION_DATA: { [K in SectionKey]: SectionDataMap[K] } = {
  executive_summary: {
    overallScore: 8.4,
    verdict: "conditional",
    confidence: 82,
    headline:
      "Best-in-class issue tracking with thin enterprise compliance evidence.",
    bestSuitedFor: [
      "Product engineering teams under 500 people",
      "Teams replacing Jira for speed",
    ],
    avoidIf: [
      "You need a downloadable SOC 2 report today",
      "You require deep custom workflow automation",
    ],
    highlights: [
      "Fastest-in-class UX; keyboard-first workflows cited across review sites",
      "SSO and SCIM available, but only on the top tier",
      "SOC 2 claimed on the security page with no artifact behind it",
      "Seat-based pricing becomes the dominant cost past ~200 users",
    ],
    claims: [
      {
        id: "c1",
        text: "SOC 2 Type II is claimed but unverified.",
        confidence: 71,
        evidenceIds: ["e-security"],
      },
    ],
  },
  company_overview: {
    founded: "2019",
    hq: "San Francisco, USA",
    employees: "200-500",
    funding: "$130M (Series B+)",
    investors: ["Accel", "Sequoia"],
    estimatedArr: "$100M+",
    customers: ["Vercel", "Ramp", "Cash App"],
    regions: ["Global"],
    recentGrowth: "Steady expansion into planning and agent workflows.",
    claims: [
      {
        id: "c2",
        text: "Headcount estimated from public profiles.",
        confidence: 62,
        evidenceIds: ["e-docs"],
      },
    ],
  },
  product_overview: {
    whatTheySell: "Modern issue tracking and planning for software teams.",
    primaryCustomers: ["Startups", "Product engineering orgs"],
    useCases: ["Issue tracking", "Cycle planning", "Roadmapping"],
    differentiators: ["Speed", "Opinionated UX", "Keyboard-first design"],
    coreProducts: [
      { name: "Issues", description: "Core issue tracker and triage workflow" },
      { name: "Cycles", description: "Time-boxed sprint planning" },
      { name: "Projects", description: "Cross-team roadmap and milestones" },
    ],
    claims: [],
  },
  feature_analysis: {
    features: [
      {
        name: "REST / GraphQL API",
        present: "yes",
        quality: "excellent",
        notes: "GraphQL-first with generated SDK.",
        evidenceIds: ["e-docs"],
      },
      {
        name: "SSO (SAML)",
        present: "yes",
        quality: "good",
        notes: "Enterprise plan only.",
        evidenceIds: ["e-security"],
      },
      {
        name: "SCIM provisioning",
        present: "limited",
        quality: "average",
        notes: "Available on Enterprise; limited group mapping.",
        evidenceIds: ["e-security"],
      },
      {
        name: "Custom reporting",
        present: "limited",
        quality: "fair",
        notes: "Reviewers cite shallow analytics.",
        evidenceIds: ["e-g2"],
      },
      {
        name: "On-prem deployment",
        present: "no",
        quality: "unknown",
        notes: null,
        evidenceIds: [],
      },
    ],
    claims: [],
  },
  community_sentiment: {
    overall: "positive",
    trend: "stable",
    positiveThemes: [
      {
        theme: "Speed and UX",
        examples: ["Praised on HN as the fastest tracker"],
        evidenceIds: ["e-hn"],
      },
      {
        theme: "Opinionated defaults",
        examples: ["Teams ship without configuring workflows for weeks"],
        evidenceIds: ["e-g2"],
      },
    ],
    negativeThemes: [
      {
        theme: "Cost at scale",
        examples: ["Seat pricing concerns past 200 users"],
        evidenceIds: ["e-reddit"],
      },
      {
        theme: "Reporting depth",
        examples: ["Limited custom dashboards"],
        evidenceIds: ["e-g2"],
      },
    ],
    claims: [],
  },
  security_compliance: {
    enterpriseReadiness: 78,
    certifications: [
      { name: "SOC 2 Type II", status: "claimed", evidenceIds: ["e-security"] },
      { name: "GDPR", status: "available", evidenceIds: ["e-security"] },
      { name: "ISO 27001", status: "not_found", evidenceIds: [] },
      { name: "HIPAA", status: "not_found", evidenceIds: [] },
    ],
    controls: [
      {
        name: "SSO",
        status: "supported",
        notes: "SAML on Enterprise.",
        evidenceIds: ["e-security"],
      },
      {
        name: "SCIM",
        status: "limited",
        notes: "Enterprise only.",
        evidenceIds: ["e-security"],
      },
      {
        name: "Audit logs",
        status: "supported",
        notes: null,
        evidenceIds: ["e-security"],
      },
      {
        name: "Data residency",
        status: "not_found",
        notes: "No region pinning documented.",
        evidenceIds: [],
      },
    ],
    concerns: [
      "No downloadable SOC 2 report found",
      "No documented data residency options",
    ],
    incidents: [],
    claims: [
      {
        id: "c3",
        text: "Audit logging inferred from feature page wording.",
        confidence: 61,
        evidenceIds: ["e-security"],
      },
    ],
  },
  pricing_intelligence: {
    model: "Per seat, monthly or annual",
    freeTier: "Free up to 250 issues and 2 teams",
    plans: [
      {
        name: "Free",
        price: "$0",
        unit: "per user / mo",
        notes: "Capped issue history.",
        evidenceIds: ["e-pricing"],
      },
      {
        name: "Basic",
        price: "$8",
        unit: "per user / mo",
        notes: "Annual billing.",
        evidenceIds: ["e-pricing"],
      },
      {
        name: "Business",
        price: "$14",
        unit: "per user / mo",
        notes: "Adds integrations and insights.",
        evidenceIds: ["e-pricing"],
      },
      {
        name: "Enterprise",
        price: null,
        unit: null,
        notes: "Custom; SSO/SCIM gated here.",
        evidenceIds: ["e-pricing"],
      },
    ],
    hiddenCosts: [
      "SSO and SCIM require Enterprise",
      "No published volume discount past 200 seats",
    ],
    estimatedAnnualSpend: "~$6,700/yr for 40 seats on Business",
    competitorComparison: [
      {
        competitor: "Jira",
        relativePrice: "more_expensive",
        notes: "Linear costs more per seat at small scale.",
      },
      {
        competitor: "Shortcut",
        relativePrice: "similar",
        notes: null,
      },
      {
        competitor: "GitHub Issues",
        relativePrice: "cheaper",
        notes: "Bundled with existing GitHub spend.",
      },
    ],
    claims: [],
  },
  competitor_analysis: {
    competitors: [
      {
        name: "Jira",
        domain: "atlassian.com",
        positioning: "Enterprise-grade configurability",
        strengths: ["Deep customization", "Compliance artifacts", "Ecosystem"],
        weaknesses: ["Slow UI", "Heavy admin overhead"],
        evidenceIds: ["e-g2"],
      },
      {
        name: "Shortcut",
        domain: "shortcut.com",
        positioning: "Balanced tracker for mid-size teams",
        strengths: ["Simple model", "Fair pricing"],
        weaknesses: ["Smaller ecosystem"],
        evidenceIds: [],
      },
      {
        name: "GitHub Issues",
        domain: "github.com",
        positioning: "Free tracker next to the code",
        strengths: ["Zero extra cost", "Native to dev workflow"],
        weaknesses: ["Thin planning features"],
        evidenceIds: [],
      },
    ],
    featureMatrix: [
      {
        feature: "SAML SSO",
        values: {
          Linear: "yes",
          Jira: "yes",
          Shortcut: "yes",
          "GitHub Issues": "yes",
        },
      },
      {
        feature: "SCIM",
        values: {
          Linear: "limited",
          Jira: "yes",
          Shortcut: "limited",
          "GitHub Issues": "yes",
        },
      },
      {
        feature: "Custom reporting",
        values: {
          Linear: "limited",
          Jira: "yes",
          Shortcut: "limited",
          "GitHub Issues": "no",
        },
      },
      {
        feature: "On-prem",
        values: {
          Linear: "no",
          Jira: "yes",
          Shortcut: "no",
          "GitHub Issues": "yes",
        },
      },
    ],
    claims: [],
  },
  engineering_health: {
    documentationQuality: "excellent",
    apiQuality: "excellent",
    sdkMaturity: "good",
    releaseCadence: "Weekly changelog entries",
    statusPage: { present: true, url: "https://status.linear.app" },
    openSourceSignals: "Public SDK and CLI repos with active commits.",
    deprecationPolicy: "Documented API versioning with advance notice.",
    notes: [
      "GraphQL schema is published and versioned",
      "Webhook coverage is broad",
    ],
    claims: [],
  },
  risk_assessment: {
    categories: [
      {
        category: "compliance",
        level: "medium",
        rationale: "SOC 2 claimed without a retrievable artifact.",
        evidenceIds: ["e-security"],
      },
      {
        category: "pricing",
        level: "medium",
        rationale: "Seat model with no public volume discount.",
        evidenceIds: ["e-pricing", "e-reddit"],
      },
      {
        category: "vendor_lock_in",
        level: "high",
        rationale: "Migration off the platform depends entirely on the API.",
        evidenceIds: ["e-docs"],
      },
      {
        category: "product",
        level: "low",
        rationale: "Core tracking is mature and heavily used.",
        evidenceIds: ["e-g2"],
      },
      {
        category: "company_stability",
        level: "low",
        rationale: "Well funded with strong growth signals.",
        evidenceIds: [],
      },
      {
        category: "security",
        level: "medium",
        rationale: "No documented data residency controls.",
        evidenceIds: ["e-security"],
      },
      {
        category: "scalability",
        level: "low",
        rationale: "No sustained performance complaints at reported scale.",
        evidenceIds: ["e-hn"],
      },
    ],
    topRisks: [
      {
        title: "Export path is API-only",
        severity: "high",
        summary:
          "Leaving the platform requires custom tooling against the public API.",
        evidenceIds: ["e-docs"],
      },
      {
        title: "Unverified SOC 2 posture",
        severity: "medium",
        summary:
          "Procurement will likely block until a report or trust portal is produced.",
        evidenceIds: ["e-security"],
      },
      {
        title: "Cost growth past 200 seats",
        severity: "medium",
        summary: "Per-seat pricing with no published discount ladder.",
        evidenceIds: ["e-pricing", "e-reddit"],
      },
    ],
    claims: [],
  },
  recommendation: {
    adopt: "conditional",
    confidence: 82,
    why: [
      "Fastest issue tracking UX in the category, with low configuration overhead",
      "API and documentation quality reduce integration risk",
      "Pricing is competitive at your current team size",
    ],
    caveats: [
      "Request the SOC 2 report under NDA before signing",
      "Negotiate a volume discount clause before crossing 200 seats",
      "Budget engineering time for an export script to limit lock-in",
    ],
    bestSuitedFor: [
      "Product engineering teams under 500 people",
      "Teams replacing Jira for speed",
    ],
    avoidIf: [
      "You need a downloadable SOC 2 report today",
      "You require deep custom workflow automation",
    ],
    overallScore: 8.4,
    claims: [],
  },
}
