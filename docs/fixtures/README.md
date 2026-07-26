# API fixtures (for frontend mocks)

Copy these JSON payloads into FE mocks (`NEXT_PUBLIC_USE_API_MOCKS=true`) until stub/real API is live.

Full completed example is large — see [`../API_CONTRACT.md`](../API_CONTRACT.md) section examples plus the completed fixture below.

## `evaluation.queued.json`

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
    "updatedAt": "2026-07-26T07:54:12.000Z",
    "completedAt": null,
    "error": null,
    "progress": {
      "percent": 0,
      "phase": "queued",
      "phases": [
        { "key": "resolving_entity", "status": "pending" },
        { "key": "collecting_official", "status": "pending" },
        { "key": "collecting_external", "status": "pending" },
        { "key": "analyzing", "status": "pending" },
        { "key": "recommending", "status": "pending" }
      ],
      "sectionsCompleted": 0,
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
      { "key": "executive_summary", "title": "Executive Summary", "status": "pending", "confidence": null, "updatedAt": null, "error": null, "data": null },
      { "key": "company_overview", "title": "Company Overview", "status": "pending", "confidence": null, "updatedAt": null, "error": null, "data": null },
      { "key": "product_overview", "title": "Product Overview", "status": "pending", "confidence": null, "updatedAt": null, "error": null, "data": null },
      { "key": "feature_analysis", "title": "Feature Analysis", "status": "pending", "confidence": null, "updatedAt": null, "error": null, "data": null },
      { "key": "community_sentiment", "title": "Community Sentiment", "status": "pending", "confidence": null, "updatedAt": null, "error": null, "data": null },
      { "key": "security_compliance", "title": "Security & Compliance", "status": "pending", "confidence": null, "updatedAt": null, "error": null, "data": null },
      { "key": "pricing_intelligence", "title": "Pricing Intelligence", "status": "pending", "confidence": null, "updatedAt": null, "error": null, "data": null },
      { "key": "competitor_analysis", "title": "Competitor Analysis", "status": "pending", "confidence": null, "updatedAt": null, "error": null, "data": null },
      { "key": "engineering_health", "title": "Engineering Health", "status": "pending", "confidence": null, "updatedAt": null, "error": null, "data": null },
      { "key": "risk_assessment", "title": "Risk Assessment", "status": "pending", "confidence": null, "updatedAt": null, "error": null, "data": null },
      { "key": "recommendation", "title": "Recommendation", "status": "pending", "confidence": null, "updatedAt": null, "error": null, "data": null }
    ],
    "findings": [],
    "evidence": [],
    "poll": {
      "shouldPoll": true,
      "pollAfterMs": 2000,
      "etag": "W/\"queued-0-0\""
    }
  }
}
```

## `evaluation.failed.json`

```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "status": "failed",
    "phase": "failed",
    "input": "https://not-a-real-saas-xyz.example",
    "normalizedUrl": "https://not-a-real-saas-xyz.example",
    "companyName": null,
    "domain": "not-a-real-saas-xyz.example",
    "createdAt": "2026-07-26T07:54:12.000Z",
    "updatedAt": "2026-07-26T07:55:01.000Z",
    "completedAt": "2026-07-26T07:55:01.000Z",
    "error": {
      "code": "PIPELINE_FAILED",
      "message": "Could not collect official sources for this domain.",
      "phase": "collecting_official"
    },
    "progress": {
      "percent": 20,
      "phase": "failed",
      "phases": [
        { "key": "resolving_entity", "status": "completed" },
        { "key": "collecting_official", "status": "failed" },
        { "key": "collecting_external", "status": "pending" },
        { "key": "analyzing", "status": "pending" },
        { "key": "recommending", "status": "pending" }
      ],
      "sectionsCompleted": 0,
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
    "sections": [],
    "findings": [],
    "evidence": [],
    "poll": {
      "shouldPoll": false,
      "pollAfterMs": 0,
      "etag": "W/\"failed-20-0\""
    }
  }
}
```

## `evaluation.running.json` (mid-analysis)

Use for progress UI: some sections completed, others running/pending.

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
        "key": "executive_summary",
        "title": "Executive Summary",
        "status": "pending",
        "confidence": null,
        "updatedAt": null,
        "error": null,
        "data": null
      },
      {
        "key": "company_overview",
        "title": "Company Overview",
        "status": "completed",
        "confidence": 78,
        "updatedAt": "2026-07-26T07:55:40.000Z",
        "error": null,
        "data": {
          "founded": "2019",
          "hq": "San Francisco, USA",
          "employees": "200-500",
          "funding": "Series B+",
          "investors": ["Accel", "Sequoia"],
          "estimatedArr": null,
          "customers": ["Product-led SaaS companies"],
          "regions": ["Global"],
          "recentGrowth": "Continued product expansion",
          "claims": []
        }
      },
      {
        "key": "product_overview",
        "title": "Product Overview",
        "status": "completed",
        "confidence": 88,
        "updatedAt": "2026-07-26T07:55:50.000Z",
        "error": null,
        "data": {
          "whatTheySell": "Modern issue tracking for software teams",
          "primaryCustomers": ["Startups", "Product engineering orgs"],
          "useCases": ["Issue tracking", "Cycle planning"],
          "differentiators": ["Speed", "Opinionated UX"],
          "coreProducts": [{ "name": "Linear", "description": "Core issue tracker" }],
          "claims": []
        }
      },
      {
        "key": "feature_analysis",
        "title": "Feature Analysis",
        "status": "completed",
        "confidence": 85,
        "updatedAt": "2026-07-26T07:55:55.000Z",
        "error": null,
        "data": {
          "features": [
            { "name": "API", "present": "yes", "quality": "excellent", "notes": null, "evidenceIds": ["e-docs"] },
            { "name": "SSO", "present": "yes", "quality": "good", "notes": "Enterprise plan", "evidenceIds": ["e-security"] }
          ],
          "claims": []
        }
      },
      {
        "key": "community_sentiment",
        "title": "Community Sentiment",
        "status": "completed",
        "confidence": 80,
        "updatedAt": "2026-07-26T07:55:58.000Z",
        "error": null,
        "data": {
          "overall": "positive",
          "trend": "stable",
          "positiveThemes": [
            { "theme": "Beautiful UX", "examples": ["Praised on HN"], "evidenceIds": ["e-hn"] }
          ],
          "negativeThemes": [
            { "theme": "Expensive at scale", "examples": ["Seat pricing concerns"], "evidenceIds": ["e-reddit"] }
          ],
          "claims": []
        }
      },
      {
        "key": "security_compliance",
        "title": "Security & Compliance",
        "status": "completed",
        "confidence": 70,
        "updatedAt": "2026-07-26T07:56:00.000Z",
        "error": null,
        "data": {
          "enterpriseReadiness": 78,
          "certifications": [
            { "name": "SOC2", "status": "claimed", "evidenceIds": ["e-security"] }
          ],
          "controls": [
            { "name": "SSO", "status": "supported", "notes": null, "evidenceIds": ["e-security"] }
          ],
          "concerns": ["No downloadable SOC2 report found"],
          "incidents": [],
          "claims": []
        }
      },
      {
        "key": "pricing_intelligence",
        "title": "Pricing Intelligence",
        "status": "running",
        "confidence": null,
        "updatedAt": "2026-07-26T07:56:01.000Z",
        "error": null,
        "data": null
      },
      {
        "key": "competitor_analysis",
        "title": "Competitor Analysis",
        "status": "pending",
        "confidence": null,
        "updatedAt": null,
        "error": null,
        "data": null
      },
      {
        "key": "engineering_health",
        "title": "Engineering Health",
        "status": "pending",
        "confidence": null,
        "updatedAt": null,
        "error": null,
        "data": null
      },
      {
        "key": "risk_assessment",
        "title": "Risk Assessment",
        "status": "pending",
        "confidence": null,
        "updatedAt": null,
        "error": null,
        "data": null
      },
      {
        "key": "recommendation",
        "title": "Recommendation",
        "status": "pending",
        "confidence": null,
        "updatedAt": null,
        "error": null,
        "data": null
      }
    ],
    "findings": [
      {
        "id": "f2",
        "category": "compliance",
        "severity": "medium",
        "title": "SOC2 report not publicly linked",
        "summary": "Security page claims SOC2 but no downloadable report was found.",
        "confidence": 71,
        "evidenceIds": ["e-security"],
        "sectionKey": "security_compliance"
      }
    ],
    "evidence": [
      {
        "id": "e-docs",
        "sourceType": "official",
        "url": "https://linear.app/docs",
        "title": "Docs",
        "domain": "linear.app",
        "snippet": "API and product documentation",
        "fetchedAt": "2026-07-26T07:55:05.000Z"
      },
      {
        "id": "e-security",
        "sourceType": "official",
        "url": "https://linear.app/security",
        "title": "Security",
        "domain": "linear.app",
        "snippet": "We maintain SOC 2 Type II",
        "fetchedAt": "2026-07-26T07:55:10.000Z"
      },
      {
        "id": "e-hn",
        "sourceType": "external",
        "url": "https://news.ycombinator.com/item?id=1",
        "title": "HN discussion",
        "domain": "news.ycombinator.com",
        "snippet": "Users praise speed and UX",
        "fetchedAt": "2026-07-26T07:55:30.000Z"
      },
      {
        "id": "e-reddit",
        "sourceType": "external",
        "url": "https://reddit.com/r/devops/comments/example",
        "title": "Reddit thread",
        "domain": "reddit.com",
        "snippet": "Migration and pricing complaints",
        "fetchedAt": "2026-07-26T07:55:35.000Z"
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

## `POST /api/v1/evaluations` response (`201`)

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

## `evaluation.partial.json`

Same shape as completed, but `status: "partial"`, one section `status: "failed"` with `error`, and `poll.shouldPoll: false`. Banner: show completed sections; call out failed ones.

## Completed report

Build section `data` from [`API_CONTRACT.md`](../API_CONTRACT.md) §8 types. When implementation starts (Agent mode), backend will also drop real `.json` fixture files for stub mode.
