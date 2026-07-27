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
  left: string[]
  right: string[]
  leftLabel: string
  rightLabel: string
}) {
  if (left.length === 0 && right.length === 0) return null
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <div className="space-y-2">
        <Label>{leftLabel}</Label>
        <Bullets items={left} marker="+" />
      </div>
      <div className="space-y-2">
        <Label>{rightLabel}</Label>
        <Bullets items={right} marker="−" />
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

function TagFact({ label, items }: { label: string; items: string[] }) {
  if (items.length === 0) return null
  return (
    <Field label={label}>
      <Tags items={items} />
    </Field>
  )
}

function ExecutiveSummary({ data }: { data: ExecutiveSummaryData }) {
  // Score + verdict already live in the sticky header; keep this scannable.
  return (
    <div className="space-y-5">
      {data.highlights.length > 0 ? (
        <div className="space-y-2">
          <Label>Key takeaways</Label>
          <Bullets items={data.highlights} />
        </div>
      ) : (
        <p className="text-base leading-relaxed text-balance">{data.headline}</p>
      )}
      <Claims claims={data.claims} />
    </div>
  )
}

function CompanyOverview({ data }: { data: CompanyOverviewData }) {
  const hasFacts =
    data.founded ||
    data.hq ||
    data.employees ||
    data.funding ||
    data.estimatedArr ||
    data.investors.length > 0 ||
    data.customers.length > 0 ||
    data.regions.length > 0 ||
    data.recentGrowth

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Label>Founders</Label>
        {data.founders.length > 0 ? (
          <ul className="grid gap-3 sm:grid-cols-2">
            {data.founders.map((founder) => (
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
          <TagFact label="Investors" items={data.investors.slice(0, 8)} />
          {data.investors.length > 8 ? (
            <p className="pb-2 font-mono text-[11px] text-muted-foreground">
              +{data.investors.length - 8} more named in sources
            </p>
          ) : null}
          <TagFact label="Customers" items={data.customers.slice(0, 8)} />
          {data.customers.length > 8 ? (
            <p className="pb-2 font-mono text-[11px] text-muted-foreground">
              +{data.customers.length - 8} more named in sources
            </p>
          ) : null}
          <TagFact label="Regions" items={data.regions} />
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
  return (
    <div className="space-y-5">
      <p className="text-sm leading-relaxed">{data.whatTheySell}</p>
      <div>
        <TagFact label="Primary customers" items={data.primaryCustomers} />
        <TagFact label="Use cases" items={data.useCases} />
        <TagFact label="Differentiators" items={data.differentiators} />
      </div>
      {data.coreProducts.length > 0 ? (
        <div className="space-y-2">
          <Label>Core products</Label>
          <ul className="space-y-2">
            {data.coreProducts.map((product) => (
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
  // Prefer known signals; unknowns alone just clutter the table.
  const features = data.features.filter(
    (f) => !(f.present === "unknown" && f.quality === "unknown" && !f.notes)
  )
  const rows = features.length > 0 ? features : data.features

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
  themes: CommunitySentimentData["positiveThemes"]
  tone: "positive" | "negative"
}) {
  if (themes.length === 0) return <Empty />
  return (
    <ul className="space-y-3">
      {themes.map((theme) => (
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
          {theme.examples.length > 0 ? (
            <p className="pl-5 text-sm text-muted-foreground">
              {theme.examples.join(" · ")}
            </p>
          ) : null}
        </li>
      ))}
    </ul>
  )
}

function ReviewCard({ review }: { review: ReviewSourceSummary }) {
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
      {(review.pros.length > 0 || review.cons.length > 0) && (
        <div className="grid gap-3 sm:grid-cols-2">
          {review.pros.length > 0 ? (
            <div className="space-y-1">
              <Label>Pros</Label>
              <Bullets items={review.pros} marker="+" />
            </div>
          ) : null}
          {review.cons.length > 0 ? (
            <div className="space-y-1">
              <Label>Cons</Label>
              <Bullets items={review.cons} marker="−" />
            </div>
          ) : null}
        </div>
      )}
      {review.sampleQuotes.length > 0 ? (
        <ul className="space-y-2">
          {review.sampleQuotes.map((quote) => (
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

      {data.reviews.length > 0 ? (
        <div className="space-y-3">
          <Label>Review sites</Label>
          <div className="grid gap-3">
            {data.reviews.map((review) => (
              <ReviewCard
                key={`${review.source}-${review.sourceLabel}`}
                review={review}
              />
            ))}
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          No Glassdoor / AmbitionBox / G2 review pages were collected for this
          run.
        </p>
      )}

      {(data.positiveThemes.length > 0 || data.negativeThemes.length > 0) && (
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>What people like</Label>
            <ThemeList themes={data.positiveThemes} tone="positive" />
          </div>
          <div className="space-y-2">
            <Label>What people complain about</Label>
            <ThemeList themes={data.negativeThemes} tone="negative" />
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
  const certs = data.certifications.filter((c) => c.status !== "unknown")
  const controls = data.controls.filter((c) => c.status !== "unknown")

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

      {controls.length > 0 ? (
        <div className="space-y-2">
          <Label>Controls</Label>
          <DataTable head={["Control", "Status", "Notes"]}>
            {controls.map((control) => (
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

      {data.concerns.length > 0 ? (
        <div className="space-y-2">
          <Label>Concerns</Label>
          <Bullets items={data.concerns} marker="!" />
        </div>
      ) : null}

      {data.incidents.length > 0 ? (
        <div className="space-y-2">
          <Label>Incidents</Label>
          <ul className="space-y-2">
            {data.incidents.map((incident) => (
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
  return (
    <div className="space-y-5">
      <div>
        <Fact label="Model" value={data.model} />
        <Fact label="Free tier" value={data.freeTier} />
        <Fact label="Est. annual spend" value={data.estimatedAnnualSpend} />
      </div>

      {data.plans.length > 0 ? (
        <div className="space-y-2">
          <Label>Plans</Label>
          <DataTable head={["Plan", "Price", "Notes"]}>
            {data.plans.map((plan) => (
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

      {data.hiddenCosts.length > 0 ? (
        <div className="space-y-2">
          <Label>Watch-outs</Label>
          <Bullets items={data.hiddenCosts} marker="!" />
        </div>
      ) : null}

      {data.competitorComparison.length > 0 ? (
        <div className="space-y-2">
          <Label>Versus alternatives</Label>
          <DataTable head={["Competitor", "Relative price", "Notes"]}>
            {data.competitorComparison.map((row) => (
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
  if (data.competitors.length === 0 && data.featureMatrix.length === 0) {
    return <Empty>No competitors identified from sources</Empty>
  }

  const columns =
    data.featureMatrix.length > 0
      ? Object.keys(data.featureMatrix[0].values)
      : []

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        {data.competitors.map((competitor) => (
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
            {data.featureMatrix.map((row) => (
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
        {data.statusPage.present && data.statusPage.url ? (
          <Field label="Status page">
            <a
              className="font-mono text-sm underline underline-offset-4"
              href={data.statusPage.url}
              target="_blank"
              rel="noreferrer"
            >
              {data.statusPage.url}
            </a>
          </Field>
        ) : null}
        <Fact label="Open source" value={data.openSourceSignals} />
        <Fact label="Deprecation policy" value={data.deprecationPolicy} />
      </div>
      {data.notes.length > 0 ? <Bullets items={data.notes} /> : null}
      <Claims claims={data.claims} />
    </div>
  )
}

function RiskAssessment({ data }: { data: RiskAssessmentData }) {
  const knownCategories = data.categories.filter((c) => c.level !== "unknown")

  return (
    <div className="space-y-5">
      {data.topRisks.length > 0 ? (
        <div className="space-y-2">
          <Label>Top risks</Label>
          <ul className="space-y-3">
            {data.topRisks.map((risk) => (
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
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <VerdictPill verdict={data.adopt} className="text-sm" />
        <span className="font-mono text-2xl tabular-nums">
          {data.overallScore.toFixed(1)}
          <span className="text-sm text-muted-foreground">/10</span>
        </span>
      </div>
      {data.why.length > 0 ? (
        <div className="space-y-2">
          <Label>Why</Label>
          <Bullets items={data.why} marker="+" />
        </div>
      ) : null}
      {data.caveats.length > 0 ? (
        <div className="space-y-2">
          <Label>Conditions</Label>
          <Bullets items={data.caveats} marker="!" />
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
