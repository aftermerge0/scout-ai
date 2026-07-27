/**
 * Static landing-page specimen. Not a mock API — just enough completed report
 * shape for `ReportPreview` to render real report components.
 */
import type { Evaluation } from "@/types/scout-api"
import { SECTION_TITLES } from "@/types/scout-api"

const NOW = "2026-07-26T08:00:00.000Z"

export function sampleEvaluation(): Evaluation {
  return {
    id: "specimen",
    status: "completed",
    phase: "done",
    input: "linear.app",
    normalizedUrl: "https://linear.app",
    companyName: "Linear",
    domain: "linear.app",
    createdAt: NOW,
    updatedAt: NOW,
    completedAt: NOW,
    error: null,
    progress: {
      percent: 100,
      phase: "done",
      phases: [
        { key: "resolving_entity", status: "completed" },
        { key: "collecting_official", status: "completed" },
        { key: "collecting_external", status: "completed" },
        { key: "analyzing", status: "completed" },
        { key: "recommending", status: "completed" },
      ],
      sectionsCompleted: 11,
      sectionsTotal: 11,
    },
    summary: {
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
    },
    sections: [
      {
        key: "company_overview",
        title: SECTION_TITLES.company_overview,
        status: "completed",
        confidence: 78,
        updatedAt: NOW,
        error: null,
        data: null,
      },
      {
        key: "security_compliance",
        title: SECTION_TITLES.security_compliance,
        status: "completed",
        confidence: 70,
        updatedAt: NOW,
        error: null,
        data: null,
      },
      {
        key: "pricing_intelligence",
        title: SECTION_TITLES.pricing_intelligence,
        status: "completed",
        confidence: 74,
        updatedAt: NOW,
        error: null,
        data: null,
      },
      {
        key: "risk_assessment",
        title: SECTION_TITLES.risk_assessment,
        status: "completed",
        confidence: 64,
        updatedAt: NOW,
        error: null,
        data: null,
      },
    ],
    findings: [
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
    ],
    evidence: [
      {
        id: "e-security",
        sourceType: "official",
        url: "https://linear.app/security",
        title: "Security",
        domain: "linear.app",
        snippet: "We maintain SOC 2 Type II compliance.",
        fetchedAt: NOW,
      },
      {
        id: "e-pricing",
        sourceType: "official",
        url: "https://linear.app/pricing",
        title: "Pricing",
        domain: "linear.app",
        snippet: "Free, Basic $8/user/mo, Business $14/user/mo.",
        fetchedAt: NOW,
      },
      {
        id: "e-reddit",
        sourceType: "external",
        url: "https://reddit.com/r/devops/comments/example",
        title: "Reddit thread",
        domain: "reddit.com",
        snippet: "Seat pricing gets steep past ~200 people.",
        fetchedAt: NOW,
      },
    ],
    poll: {
      shouldPoll: false,
      pollAfterMs: 0,
      etag: 'W/"specimen-completed-4"',
    },
  }
}
