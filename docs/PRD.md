# Product Requirements Document (PRD)

# Project Codename: **Scout**

### AI Due Diligence Engine

**Version:** 1.0 (Hackathon MVP with Product Vision)

---

# 1. Vision

Today's AI research tools answer:

> *"What is this company?"*

Scout answers:

> **"Should I trust this company for my use case?"**

Scout is an AI-powered due diligence engine that performs analyst-grade research across companies, products, vendors, APIs, open-source projects, and startups by combining official information, third-party opinions, market signals, and AI reasoning into a single actionable report.

Rather than summarizing the internet, Scout evaluates evidence, identifies risks, and provides recommendations tailored to the user's context.

---

# 2. Problem Statement

Whether you're:

- buying SaaS software
- integrating an API
- evaluating an AI model
- investing in a startup
- joining a company
- selecting a vendor

the research process is fragmented.

Users jump across:

- Company website
- Docs
- Pricing pages
- Reddit
- Hacker News
- Product Hunt
- GitHub
- Status pages
- Security pages
- LinkedIn
- G2
- Blogs
- News

This typically takes several hours and still leaves uncertainty.

Current AI tools summarize information but rarely:

- verify claims
- detect contradictions
- identify risks
- compare competitors
- recommend a decision

---

# 3. Target Users

## Primary

### Founders

Before buying tools.

---

### Engineering Managers

Evaluating developer tools.

---

### CTOs

Vendor evaluation.

---

### Investors

Startup research.

---

### Procurement Teams

Vendor due diligence.

---

## Secondary

- Product Managers
- Consultants
- Security teams
- Enterprise buyers
- Recruiters

---

# 4. User Stories

### Founder

> I want to know whether Linear is worth replacing Jira.

---

### CTO

> Can this AI company safely access our production data?

---

### Investor

> Is this startup actually growing?

---

### Engineer

> Is this open-source library actively maintained?

---

### Procurement

> What risks exist before signing a contract?

---

# 5. MVP Scope

Input

```
Evaluate:

Linear.app
```

or

```
https://linear.app
```

Within 2–5 minutes Scout produces a complete report.

---

# 6. High-Level Architecture

```
                    User

                     │

              Company URL

                     │

          Entity Resolution Layer

                     │

        ┌────────────┴─────────────┐

        │                          │

 Firecrawl                    Exa Search

 Official Sources          External Sources

        │                          │

        └────────────┬─────────────┘

                     │

          Normalized Knowledge Graph

                     │

             AI Reasoning Layer

                     │

          Risk & Confidence Engine

                     │

          Interactive Due Diligence Report
```

---

# 7. Data Sources

## Official Sources

Firecrawl

Collect

- Homepage
- Pricing
- Documentation
- API Docs
- Blog
- Careers
- Security
- Privacy
- Status Page
- Changelog
- Customer Stories
- FAQ

---

## External Sources

Exa

Search

- Reddit
- Hacker News
- GitHub
- Product Hunt
- Medium
- Dev.to
- Independent blogs
- Reviews
- Comparisons
- Podcasts
- Interviews
- Research papers
- News

---

## Structured APIs (Future)

Crunchbase

LinkedIn

GitHub

Glassdoor

G2

Capterra

BuiltWith

Wappalyzer

SimilarWeb

---

# 8. Report Sections

## Executive Summary

```
Overall Score

8.9 / 10

Recommendation

Recommended

Confidence

92%

Best suited for

• Startups
• Product Teams
• Engineering Teams

Avoid if

• Heavy compliance requirements
```

## Company Overview

Founded, HQ, Employees, Funding, Investors, Estimated ARR, Customers, Regions, Recent growth

## Product Overview

What does the company actually sell? Primary customers, Use cases, Key differentiators, Core products

## Feature Analysis

| Feature | Present | Quality |
| --- | --- | --- |
| API | ✓ | Excellent |
| SSO | ✓ | Good |
| AI | ✓ | Average |
| Webhooks | ✓ | Excellent |
| RBAC | Limited | Fair |

## Community Sentiment

Cluster opinions into Positive Themes / Negative Themes, Sentiment, Trend over time

## Security & Compliance

SOC2, ISO, HIPAA, GDPR, Encryption, SSO, SCIM, RBAC, Audit Logs, Security incidents, Public breach history, Status page, CVEs → Enterprise Readiness score + concerns

## Pricing Intelligence

Pricing, Free tier, Usage limits, Seat pricing, Enterprise pricing, Hidden costs, Price increases, Comparison with competitors, Estimated annual spend

## Competitor Analysis

Automatically detect competitors and generate feature comparison

## Engineering Health

Documentation quality, API quality, SDK maturity, Open-source contributions, Release cadence, Status page, Deprecation policy, Issue response time

## Hiring Intelligence

Engineering / Sales / AI / International / Leadership hiring → infer company priorities

## Business Signals

Funding, Acquisitions, Layoffs, Major customers, Market expansion, Partnerships, Recent launches

## Risk Assessment

| Category | Score |
| --- | --- |
| Product Risk | Low |
| Vendor Lock-in | Medium |
| Security | Low |
| Scalability | Low |
| Pricing | Medium |
| Compliance | Medium |
| Company Stability | Low |

## Recommendation

Would I adopt it? Why? Best suited for…

---

# 9. AI Reasoning Pipeline

Each section has its own reasoning agent (Security, Community, Pricing, …). Recommendation Agent consumes everything and produces the final decision.

---

# 10. Confidence System

Every statement includes confidence so users know what is evidence-backed vs inferred.

---

# 11. Tech Stack (implementation target)

Frontend: Next.js, Tailwind, shadcn/ui  
Backend: Next.js API routes on Vercel + Inngest  
DB: Neon Postgres  
AI: Azure OpenAI  
Research: Firecrawl, Exa  
Deploy: Vercel  

---

# 12. Future Vision

Multi-agent due diligence platform: Research, Product, Security, Market, Community, Engineering, Financial, and Recommendation agents — expandable beyond company evaluations to APIs, open-source, AI models, and enterprise vendors.

## Success Metrics (Hackathon MVP)

- Complete a full evaluation in **under 5 minutes** for a publicly accessible company.
- Produce a report with **10+ structured sections** and evidence-backed confidence scores.
- Surface at least **3 actionable risks** or insights that are not obvious from the company's homepage.
- Support evaluations for **50+ popular SaaS products** without requiring custom configuration.
- Demonstrate clear provenance by linking every key finding to its underlying source.
