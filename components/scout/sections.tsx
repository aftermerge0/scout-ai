"use client"

import type {
  CommunitySentimentData,
  CompanyOverviewData,
  CompetitorAnalysisData,
  EngineeringHealthData,
  ExecutiveSummaryData,
  FeatureAnalysisData,
  PricingIntelligenceData,
  ProductOverviewData,
  RecommendationData,
  ReviewSourceSummary,
  RiskAssessmentData,
  SecurityComplianceData,
} from "@/types/scout-api"
import type { AnySection } from "@/types/scout-api"
import { asArray } from "@/lib/utils"

import { Claims, EvidenceChips } from "./evidence"
import {
  Bullets,
  Cell,
  DataTable,
  Empty,
  Field,
  Label,
  Meter,
  Pill,
  Presence,
  Quality,
  RiskPill,
  Row,
  SentimentPill,
  Tags,
  Value,
  VerdictPill,
} from "./primitives"

/** Routes a completed section to its renderer. Narrows on the discriminated key. */
export function SectionBody({ section }: { section: AnySection }) {
  if (section.data === null) return null

  switch (section.key) {
    case "executive_summary":
      return <ExecutiveSummary data={section.data} />
    case "company_overview":
      return <CompanyOverview data={section.data} />
    case "product_overview":
      return <ProductOverview data={section.data} />
    case "feature_analysis":
      return <FeatureAnalysis data={section.data} />
    case "community_sentiment":
      return <CommunitySentiment data={section.data} />
    case "security_compliance":
      return <SecurityCompliance data={section.data} />
    case "pricing_intelligence":
      return <PricingIntelligence data={section.data} />
    case "competitor_analysis":
      return <CompetitorAnalysis data={section.data} />
    case "engineering_health":
      return <EngineeringHealth data={section.data} />
    case "risk_assessment":
      return <RiskAssessment data={section.data} />
    case "recommendation":
      return <Recommendation data={section.data} />
    default: {
      const _exhaustive: never = section
      return _exhaustive
    }
  }
}

function TwoUp({
  left,
  right,
  leftLabel,
  rightLabel,
}: {
  left: string[] | null | undefined
  right: string[] | null | undefined
  leftLabel: string
  rightLabel: string
}) {
  const leftItems = asArray(left)
  const rightItems = asArray(right)
  if (leftItems.length === 0 && rightItems.length === 0) return null
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <div className="space-y-2">
        <Label>{leftLabel}</Label>
        <Bullets items={leftItems} marker="+" />
      </div>
      <div className="space-y-2">
        <Label>{rightLabel}</Label>
        <Bullets items={rightItems} marker="−" />
      </div>
    </div>
  )
}

/** Key/value only when a value exists — empty fields are noise. */
function Fact({
  label,
  value,
}: {
  label: string
  value: string | null | undefined
}) {
  if (value == null || value === "") return null
  return (
    <Field label={label}>
      <Value>{value}</Value>
    </Field>
  )
}

function TagFact({ label, items }: { label: string; items: string[] | undefined }) {
  const list = asArray(items)
  if (list.length === 0) return null
  return (
    <Field label={label}>
      <Tags items={list} />
    </Field>
  )
}

function ExecutiveSummary({ data }: { data: ExecutiveSummaryData }) {
  const highlights = asArray(data.highlights)
  // Score + verdict already live in the sticky header; keep this scannable.
  return (
    <div className="space-y-5">
      {highlights.length > 0 ? (
        <div className="space-y-2">
          <Label>Key takeaways</Label>
          <Bullets items={highlights} />
        </div>
      ) : (
        <p className="text-base leading-relaxed text-balance">{data.headline}</p>
      )}
      <Claims claims={data.claims} />
    </div>
  )
}

function CompanyOverview({ data }: { data: CompanyOverviewData }) {
  const founders = asArray(data.founders)
  const investors = asArray(data.investors)
  const customers = asArray(data.customers)
  const regions = asArray(data.regions)
  const hasFacts =
    data.founded ||
    data.hq ||
    data.employees ||
    data.funding ||
    data.estimatedArr ||
    investors.length > 0 ||
    customers.length > 0 ||
    regions.length > 0 ||
    data.recentGrowth

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Label>Founders</Label>
        {founders.length > 0 ? (
          <ul className="grid gap-3 sm:grid-cols-2">
            {founders.map((founder) => (
              <li
                key={founder.name}
                className="space-y-1 rounded-md border border-border/80 bg-muted/20 px-3 py-3"
              >
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="text-sm font-medium">{founder.name}</span>
                  {founder.role ? (
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {founder.role}
                    </span>
                  ) : null}
                  <EvidenceChips ids={founder.evidenceIds} />
                </div>
                {founder.background ? (
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {founder.background}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            No founders named in collected sources yet.
          </p>
        )}
      </div>

      {hasFacts ? (
        <div>
          <Fact label="Founded" value={data.founded} />
          <Fact label="HQ" value={data.hq} />
          <Fact label="Employees" value={data.employees} />
          <Fact label="Funding" value={data.funding} />
          <Fact label="Estimated ARR" value={data.estimatedArr} />
          <TagFact label="Investors" items={investors.slice(0, 8)} />
          {investors.length > 8 ? (
            <p className="pb-2 font-mono text-[11px] text-muted-foreground">
              +{investors.length - 8} more named in sources
            </p>
          ) : null}
          <TagFact label="Customers" items={customers.slice(0, 8)} />
          {customers.length > 8 ? (
            <p className="pb-2 font-mono text-[11px] text-muted-foreground">
              +{customers.length - 8} more named in sources
            </p>
          ) : null}
          <TagFact label="Regions" items={regions} />
          {data.recentGrowth ? (
            <Field label="Recent growth">
              <span className="text-sm">{data.recentGrowth}</span>
            </Field>
          ) : null}
        </div>
      ) : null}

      <Claims claims={data.claims} />
    </div>
  )
}

function ProductOverview({ data }: { data: ProductOverviewData }) {
  const coreProducts = asArray(data.coreProducts)
  return (
    <div className="space-y-5">
      <p className="text-sm leading-relaxed">{data.whatTheySell}</p>
      <div>
        <TagFact label="Primary customers" items={data.primaryCustomers} />
        <TagFact label="Use cases" items={data.useCases} />
        <TagFact label="Differentiators" items={data.differentiators} />
      </div>
      {coreProducts.length > 0 ? (
        <div className="space-y-2">
          <Label>Core products</Label>
          <ul className="space-y-2">
            {coreProducts.map((product) => (
              <li key={product.name} className="text-sm">
                <span className="font-medium">{product.name}</span>
                <span className="text-muted-foreground">
                  {" — "}
                  {product.description}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <Claims claims={data.claims} />
    </div>
  )
}

function FeatureAnalysis({ data }: { data: FeatureAnalysisData }) {
  const allFeatures = asArray(data.features)
  // Prefer known signals; unknowns alone just clutter the table.
  const features = allFeatures.filter(
    (f) => !(f.present === "unknown" && f.quality === "unknown" && !f.notes)
  )
  const rows = features.length > 0 ? features : allFeatures

  if (rows.length === 0) {
    return <Empty>No feature signals found</Empty>
  }

  return (
    <div className="space-y-4">
      <DataTable head={["Feature", "Present", "Quality", "Notes"]}>
        {rows.map((feature) => (
          <Row key={feature.name}>
            <Cell className="font-mono text-xs">{feature.name}</Cell>
            <Cell>
              <Presence value={feature.present} />
            </Cell>
            <Cell>
              <Quality value={feature.quality} />
            </Cell>
            <Cell className="text-muted-foreground">
              <span className="inline-flex flex-wrap items-center gap-2">
                {feature.notes ?? <Empty>-</Empty>}
                <EvidenceChips ids={feature.evidenceIds} />
              </span>
            </Cell>
          </Row>
        ))}
      </DataTable>
      <Claims claims={data.claims} />
    </div>
  )
}

function ThemeList({
  themes,
  tone,
}: {
  themes: CommunitySentimentData["positiveThemes"] | null | undefined
  tone: "positive" | "negative"
}) {
  const list = asArray(themes)
  if (list.length === 0) return <Empty />
  return (
    <ul className="space-y-3">
      {list.map((theme) => (
        <li key={theme.theme} className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              aria-hidden
              className={
                tone === "positive"
                  ? "font-mono text-emerald-600 dark:text-emerald-400"
                  : "font-mono text-red-600 dark:text-red-400"
              }
            >
              {tone === "positive" ? "+" : "−"}
            </span>
            <span className="text-sm font-medium">{theme.theme}</span>
            <EvidenceChips ids={theme.evidenceIds} />
          </div>
          {asArray(theme.examples).length > 0 ? (
            <p className="pl-5 text-sm text-muted-foreground">
              {asArray(theme.examples).join(" · ")}
            </p>
          ) : null}
        </li>
      ))}
    </ul>
  )
}

function ReviewCard({ review }: { review: ReviewSourceSummary }) {
  const pros = asArray(review.pros)
  const cons = asArray(review.cons)
  const sampleQuotes = asArray(review.sampleQuotes)
  const kind =
    review.source === "glassdoor" || review.source === "ambitionbox"
      ? "Employee"
      : review.source === "g2" ||
          review.source === "capterra" ||
          review.source === "trustpilot"
        ? "Customer"
        : null

  return (
    <article className="space-y-3 rounded-md border border-border/80 bg-muted/15 px-3 py-3">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        {review.url ? (
          <a
            href={review.url}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-medium underline-offset-4 hover:underline"
          >
            {review.sourceLabel}
          </a>
        ) : (
          <span className="text-sm font-medium">{review.sourceLabel}</span>
        )}
        {kind ? (
          <span className="font-mono text-[10px] tracking-[0.12em] text-muted-foreground uppercase">
            {kind}
          </span>
        ) : null}
        {review.rating ? (
          <span className="font-mono text-sm tabular-nums">{review.rating}</span>
        ) : null}
        {review.reviewCount ? (
          <span className="font-mono text-[11px] text-muted-foreground">
            {review.reviewCount} reviews
          </span>
        ) : null}
        <EvidenceChips ids={review.evidenceIds} />
      </div>
      {review.summary ? (
        <p className="text-sm leading-relaxed text-muted-foreground">
          {review.summary}
        </p>
      ) : null}
      {(pros.length > 0 || cons.length > 0) && (
        <div className="grid gap-3 sm:grid-cols-2">
            {pros.filter(Boolean).length > 0 ? (
              <div className="space-y-1">
                <Label>Pros</Label>
                <Bullets items={pros.filter(Boolean)} marker="+" />
              </div>
            ) : null}
            {cons.filter(Boolean).length > 0 ? (
              <div className="space-y-1">
                <Label>Cons</Label>
                <Bullets items={cons.filter(Boolean)} marker="−" />
              </div>
            ) : null}
        </div>
      )}
      {sampleQuotes.length > 0 ? (
        <ul className="space-y-2">
          {sampleQuotes.map((quote) => (
            <li
              key={quote}
              className="border-l-2 border-border pl-3 text-sm text-muted-foreground italic"
            >
              “{quote}”
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  )
}

function CommunitySentiment({ data }: { data: CommunitySentimentData }) {
  const reviews = asArray(data.reviews)
  const positiveThemes = asArray(data.positiveThemes)
  const negativeThemes = asArray(data.negativeThemes)
  const employeeReviews = reviews.filter(
    (r) => r.source === "glassdoor" || r.source === "ambitionbox"
  )
  const customerReviews = reviews.filter(
    (r) =>
      r.source === "g2" ||
      r.source === "capterra" ||
      r.source === "trustpilot"
  )
  const otherReviews = reviews.filter(
    (r) =>
      r.source !== "glassdoor" &&
      r.source !== "ambitionbox" &&
      r.source !== "g2" &&
      r.source !== "capterra" &&
      r.source !== "trustpilot"
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <SentimentPill sentiment={data.overall} />
        {data.trend !== "unknown" ? (
          <span className="font-mono text-xs text-muted-foreground">
            trend: {data.trend}
          </span>
        ) : null}
      </div>

      {employeeReviews.length > 0 ? (
        <div className="space-y-3">
          <Label>Employee reviews</Label>
          <div className="grid gap-3">
            {employeeReviews.map((review) => (
              <ReviewCard
                key={`${review.source}-${review.sourceLabel}`}
                review={review}
              />
            ))}
          </div>
        </div>
      ) : null}

      {customerReviews.length > 0 ? (
        <div className="space-y-3">
          <Label>Customer reviews</Label>
          <div className="grid gap-3">
            {customerReviews.map((review) => (
              <ReviewCard
                key={`${review.source}-${review.sourceLabel}`}
                review={review}
              />
            ))}
          </div>
        </div>
      ) : null}

      {otherReviews.length > 0 ? (
        <div className="space-y-3">
          <Label>Other review sources</Label>
          <div className="grid gap-3">
            {otherReviews.map((review) => (
              <ReviewCard
                key={`${review.source}-${review.sourceLabel}`}
                review={review}
              />
            ))}
          </div>
        </div>
      ) : null}

      {reviews.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No employee (Glassdoor / AmbitionBox) or customer (G2 / Capterra)
          review pages were collected for this run.
        </p>
      ) : null}

      {(positiveThemes.length > 0 || negativeThemes.length > 0) && (
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>What people like</Label>
            <ThemeList themes={positiveThemes} tone="positive" />
          </div>
          <div className="space-y-2">
            <Label>What people complain about</Label>
            <ThemeList themes={negativeThemes} tone="negative" />
          </div>
        </div>
      )}
      <Claims claims={data.claims} />
    </div>
  )
}

const CERT_TONE = {
  available: "low",
  claimed: "medium",
  not_found: "high",
  unknown: "unknown",
} as const

const CONTROL_TONE = {
  supported: "low",
  limited: "medium",
  not_found: "high",
  unknown: "unknown",
} as const

function SecurityCompliance({ data }: { data: SecurityComplianceData }) {
  const certifications = asArray(data.certifications)
  const controls = asArray(data.controls)
  const concerns = asArray(data.concerns)
  const incidents = asArray(data.incidents)
  const certs = certifications.filter((c) => c.status !== "unknown")
  const knownControls = controls.filter((c) => c.status !== "unknown")

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label>Enterprise readiness</Label>
        <Meter
          value={data.enterpriseReadiness}
          tone={
            data.enterpriseReadiness >= 75
              ? "good"
              : data.enterpriseReadiness >= 50
                ? "warn"
                : "bad"
          }
        />
      </div>

      {certs.length > 0 ? (
        <div className="space-y-2">
          <Label>Certifications</Label>
          <div className="flex flex-wrap gap-2">
            {certs.map((cert) => (
              <span
                key={cert.name}
                className="inline-flex items-center gap-2 rounded-md border border-border px-2 py-1"
              >
                <span className="font-mono text-xs">{cert.name}</span>
                <Pill tone={CERT_TONE[cert.status]}>
                  {cert.status.replace("_", " ")}
                </Pill>
                <EvidenceChips ids={cert.evidenceIds} />
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {knownControls.length > 0 ? (
        <div className="space-y-2">
          <Label>Controls</Label>
          <DataTable head={["Control", "Status", "Notes"]}>
            {knownControls.map((control) => (
              <Row key={control.name}>
                <Cell className="font-mono text-xs">{control.name}</Cell>
                <Cell>
                  <Pill tone={CONTROL_TONE[control.status]}>
                    {control.status.replace("_", " ")}
                  </Pill>
                </Cell>
                <Cell className="text-muted-foreground">
                  <span className="inline-flex flex-wrap items-center gap-2">
                    {control.notes ?? <Empty>-</Empty>}
                    <EvidenceChips ids={control.evidenceIds} />
                  </span>
                </Cell>
              </Row>
            ))}
          </DataTable>
        </div>
      ) : null}

      {concerns.length > 0 ? (
        <div className="space-y-2">
          <Label>Concerns</Label>
          <Bullets items={concerns} marker="!" />
        </div>
      ) : null}

      {incidents.length > 0 ? (
        <div className="space-y-2">
          <Label>Incidents</Label>
          <ul className="space-y-2">
            {incidents.map((incident) => (
              <li key={incident.title} className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">{incident.title}</span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {incident.date ?? "date unknown"}
                  </span>
                  <EvidenceChips ids={incident.evidenceIds} />
                </div>
                <p className="text-sm text-muted-foreground">
                  {incident.summary}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <Claims claims={data.claims} />
    </div>
  )
}

const RELATIVE_PRICE_TONE = {
  cheaper: "low",
  similar: "unknown",
  more_expensive: "high",
  unknown: "unknown",
} as const

function PricingIntelligence({ data }: { data: PricingIntelligenceData }) {
  const plans = asArray(data.plans)
  const hiddenCosts = asArray(data.hiddenCosts)
  const competitorComparison = asArray(data.competitorComparison)
  return (
    <div className="space-y-5">
      <div>
        <Fact label="Model" value={data.model} />
        <Fact label="Free tier" value={data.freeTier} />
        <Fact label="Est. annual spend" value={data.estimatedAnnualSpend} />
      </div>

      {plans.length > 0 ? (
        <div className="space-y-2">
          <Label>Plans</Label>
          <DataTable head={["Plan", "Price", "Notes"]}>
            {plans.map((plan) => (
              <Row key={plan.name}>
                <Cell className="font-mono text-xs">{plan.name}</Cell>
                <Cell className="font-mono text-xs whitespace-nowrap">
                  {plan.price ?? "custom"}
                  {plan.unit ? (
                    <span className="text-muted-foreground"> {plan.unit}</span>
                  ) : null}
                </Cell>
                <Cell className="text-muted-foreground">
                  <span className="inline-flex flex-wrap items-center gap-2">
                    {plan.notes ?? <Empty>-</Empty>}
                    <EvidenceChips ids={plan.evidenceIds} />
                  </span>
                </Cell>
              </Row>
            ))}
          </DataTable>
        </div>
      ) : null}

      {hiddenCosts.length > 0 ? (
        <div className="space-y-2">
          <Label>Watch-outs</Label>
          <Bullets items={hiddenCosts} marker="!" />
        </div>
      ) : null}

      {competitorComparison.length > 0 ? (
        <div className="space-y-2">
          <Label>Versus alternatives</Label>
          <DataTable head={["Competitor", "Relative price", "Notes"]}>
            {competitorComparison.map((row) => (
              <Row key={row.competitor}>
                <Cell className="font-mono text-xs">{row.competitor}</Cell>
                <Cell>
                  <Pill tone={RELATIVE_PRICE_TONE[row.relativePrice]}>
                    {row.relativePrice.replace("_", " ")}
                  </Pill>
                </Cell>
                <Cell className="text-muted-foreground">
                  {row.notes ?? <Empty>-</Empty>}
                </Cell>
              </Row>
            ))}
          </DataTable>
        </div>
      ) : null}

      <Claims claims={data.claims} />
    </div>
  )
}

function CompetitorAnalysis({ data }: { data: CompetitorAnalysisData }) {
  const competitors = asArray(data.competitors)
  const featureMatrix = asArray(data.featureMatrix)
  if (competitors.length === 0 && featureMatrix.length === 0) {
    return <Empty>No competitors identified from sources</Empty>
  }

  const columns =
    featureMatrix.length > 0
      ? Object.keys(featureMatrix[0]?.values ?? {})
      : []

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        {competitors.map((competitor) => (
          <div key={competitor.name} className="space-y-2 border-b border-dashed border-border pb-4 last:border-0 last:pb-0">
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="text-sm font-medium">{competitor.name}</span>
              {competitor.domain ? (
                <span className="font-mono text-xs text-muted-foreground">
                  {competitor.domain}
                </span>
              ) : null}
              <EvidenceChips ids={competitor.evidenceIds} />
            </div>
            {competitor.positioning ? (
              <p className="text-sm text-muted-foreground">
                {competitor.positioning}
              </p>
            ) : null}
            <TwoUp
              leftLabel="Strengths"
              rightLabel="Weaknesses"
              left={competitor.strengths}
              right={competitor.weaknesses}
            />
          </div>
        ))}
      </div>

      {columns.length > 0 ? (
        <div className="space-y-2">
          <Label>Feature matrix</Label>
          <DataTable head={["Feature", ...columns]}>
            {featureMatrix.map((row) => (
              <Row key={row.feature}>
                <Cell className="font-mono text-xs">{row.feature}</Cell>
                {columns.map((column) => (
                  <Cell key={column}>
                    <Presence value={row.values[column] ?? "unknown"} />
                  </Cell>
                ))}
              </Row>
            ))}
          </DataTable>
        </div>
      ) : null}

      <Claims claims={data.claims} />
    </div>
  )
}

function EngineeringHealth({ data }: { data: EngineeringHealthData }) {
  const notes = asArray(data.notes)
  const statusPage = data.statusPage ?? { present: false, url: null }
  return (
    <div className="space-y-4">
      <div>
        <Field label="Documentation">
          <Quality value={data.documentationQuality} />
        </Field>
        <Field label="API">
          <Quality value={data.apiQuality} />
        </Field>
        <Field label="SDK maturity">
          <Quality value={data.sdkMaturity} />
        </Field>
        <Fact label="Release cadence" value={data.releaseCadence} />
        {statusPage.present && statusPage.url ? (
          <Field label="Status page">
            <a
              className="font-mono text-sm underline underline-offset-4"
              href={statusPage.url}
              target="_blank"
              rel="noreferrer"
            >
              {statusPage.url}
            </a>
          </Field>
        ) : null}
        <Fact label="Open source" value={data.openSourceSignals} />
        <Fact label="Deprecation policy" value={data.deprecationPolicy} />
      </div>
      {notes.length > 0 ? <Bullets items={notes} /> : null}
      <Claims claims={data.claims} />
    </div>
  )
}

function RiskAssessment({ data }: { data: RiskAssessmentData }) {
  const topRisks = asArray(data.topRisks)
  const categories = asArray(data.categories)
  const knownCategories = categories.filter((c) => c.level !== "unknown")

  return (
    <div className="space-y-5">
      {topRisks.length > 0 ? (
        <div className="space-y-2">
          <Label>Top risks</Label>
          <ul className="space-y-3">
            {topRisks.map((risk) => (
              <li key={risk.title} className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <RiskPill level={risk.severity} />
                  <span className="text-sm font-medium">{risk.title}</span>
                  <EvidenceChips ids={risk.evidenceIds} />
                </div>
                <p className="text-sm text-muted-foreground">{risk.summary}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {knownCategories.length > 0 ? (
        <div className="space-y-2">
          <Label>By category</Label>
          <DataTable head={["Category", "Level", "Rationale"]}>
            {knownCategories.map((category) => (
              <Row key={category.category}>
                <Cell className="font-mono text-xs whitespace-nowrap">
                  {category.category.replace(/_/g, " ")}
                </Cell>
                <Cell>
                  <RiskPill level={category.level} />
                </Cell>
                <Cell className="text-muted-foreground">
                  <span className="inline-flex flex-wrap items-center gap-2">
                    {category.rationale}
                    <EvidenceChips ids={category.evidenceIds} />
                  </span>
                </Cell>
              </Row>
            ))}
          </DataTable>
        </div>
      ) : null}

      <Claims claims={data.claims} />
    </div>
  )
}

function Recommendation({ data }: { data: RecommendationData }) {
  const why = asArray(data.why)
  const caveats = asArray(data.caveats)
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <VerdictPill verdict={data.adopt} className="text-sm" />
        {data.overallScore != null ? (
          <span className="font-mono text-2xl tabular-nums">
            {data.overallScore.toFixed(1)}
            <span className="text-sm text-muted-foreground">/10</span>
          </span>
        ) : null}
      </div>
      {why.length > 0 ? (
        <div className="space-y-2">
          <Label>Why</Label>
          <Bullets items={why} marker="+" />
        </div>
      ) : null}
      {caveats.length > 0 ? (
        <div className="space-y-2">
          <Label>Conditions</Label>
          <Bullets items={caveats} marker="!" />
        </div>
      ) : null}
      <TwoUp
        leftLabel="Best suited for"
        rightLabel="Avoid if"
        left={data.bestSuitedFor}
        right={data.avoidIf}
      />
      <Claims claims={data.claims} />
    </div>
  )
}
