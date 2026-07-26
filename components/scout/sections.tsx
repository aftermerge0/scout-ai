"use client"

import type {
  AnySection,
  CommunitySentimentData,
  CompanyOverviewData,
  CompetitorAnalysisData,
  EngineeringHealthData,
  ExecutiveSummaryData,
  FeatureAnalysisData,
  PricingIntelligenceData,
  ProductOverviewData,
  RecommendationData,
  RiskAssessmentData,
  SecurityComplianceData,
} from "@/types/scout-api"

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

function ExecutiveSummary({ data }: { data: ExecutiveSummaryData }) {
  return (
    <div className="space-y-5">
      <p className="text-base leading-relaxed text-balance">{data.headline}</p>
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-mono text-2xl tabular-nums">
          {data.overallScore.toFixed(1)}
          <span className="text-sm text-muted-foreground">/10</span>
        </span>
        <VerdictPill verdict={data.verdict} />
      </div>
      <div className="space-y-2">
        <Label>Highlights</Label>
        <Bullets items={data.highlights} />
      </div>
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

function CompanyOverview({ data }: { data: CompanyOverviewData }) {
  return (
    <div>
      <Field label="Founded">
        <Value>{data.founded}</Value>
      </Field>
      <Field label="HQ">
        <Value>{data.hq}</Value>
      </Field>
      <Field label="Employees">
        <Value>{data.employees}</Value>
      </Field>
      <Field label="Funding">
        <Value>{data.funding}</Value>
      </Field>
      <Field label="Estimated ARR">
        <Value>{data.estimatedArr}</Value>
      </Field>
      <Field label="Investors">
        <Tags items={data.investors} />
      </Field>
      <Field label="Customers">
        <Tags items={data.customers} />
      </Field>
      <Field label="Regions">
        <Tags items={data.regions} />
      </Field>
      <Field label="Recent growth">
        {data.recentGrowth ? (
          <span className="text-sm">{data.recentGrowth}</span>
        ) : (
          <Empty />
        )}
      </Field>
      <Claims claims={data.claims} />
    </div>
  )
}

function ProductOverview({ data }: { data: ProductOverviewData }) {
  return (
    <div className="space-y-5">
      <p className="text-sm leading-relaxed">{data.whatTheySell}</p>
      <div>
        <Field label="Primary customers">
          <Tags items={data.primaryCustomers} />
        </Field>
        <Field label="Use cases">
          <Tags items={data.useCases} />
        </Field>
        <Field label="Differentiators">
          <Tags items={data.differentiators} />
        </Field>
      </div>
      <div className="space-y-2">
        <Label>Core products</Label>
        <DataTable head={["Product", "Description"]}>
          {data.coreProducts.map((product) => (
            <Row key={product.name}>
              <Cell className="w-40 font-mono text-xs">{product.name}</Cell>
              <Cell className="text-muted-foreground">
                {product.description}
              </Cell>
            </Row>
          ))}
        </DataTable>
      </div>
      <Claims claims={data.claims} />
    </div>
  )
}

function FeatureAnalysis({ data }: { data: FeatureAnalysisData }) {
  return (
    <div className="space-y-4">
      <DataTable head={["Feature", "Present", "Quality", "Notes", "Sources"]}>
        {data.features.map((feature) => (
          <Row key={feature.name}>
            <Cell className="font-mono text-xs">{feature.name}</Cell>
            <Cell>
              <Presence value={feature.present} />
            </Cell>
            <Cell>
              <Quality value={feature.quality} />
            </Cell>
            <Cell className="text-muted-foreground">
              {feature.notes ?? <Empty>—</Empty>}
            </Cell>
            <Cell>
              <EvidenceChips ids={feature.evidenceIds} />
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

function CommunitySentiment({ data }: { data: CommunitySentimentData }) {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <SentimentPill sentiment={data.overall} />
        <span className="font-mono text-xs text-muted-foreground">
          trend: {data.trend}
        </span>
      </div>
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

      <div className="space-y-2">
        <Label>Certifications</Label>
        <DataTable head={["Certification", "Status", "Sources"]}>
          {data.certifications.map((cert) => (
            <Row key={cert.name}>
              <Cell className="font-mono text-xs">{cert.name}</Cell>
              <Cell>
                <Pill tone={CERT_TONE[cert.status]}>
                  {cert.status.replace("_", " ")}
                </Pill>
              </Cell>
              <Cell>
                <EvidenceChips ids={cert.evidenceIds} />
              </Cell>
            </Row>
          ))}
        </DataTable>
      </div>

      <div className="space-y-2">
        <Label>Controls</Label>
        <DataTable head={["Control", "Status", "Notes", "Sources"]}>
          {data.controls.map((control) => (
            <Row key={control.name}>
              <Cell className="font-mono text-xs">{control.name}</Cell>
              <Cell>
                <Pill tone={CONTROL_TONE[control.status]}>
                  {control.status.replace("_", " ")}
                </Pill>
              </Cell>
              <Cell className="text-muted-foreground">
                {control.notes ?? <Empty>—</Empty>}
              </Cell>
              <Cell>
                <EvidenceChips ids={control.evidenceIds} />
              </Cell>
            </Row>
          ))}
        </DataTable>
      </div>

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
        <Field label="Model">
          <Value>{data.model}</Value>
        </Field>
        <Field label="Free tier">
          <Value>{data.freeTier}</Value>
        </Field>
        <Field label="Est. annual spend">
          <Value>{data.estimatedAnnualSpend}</Value>
        </Field>
      </div>

      <div className="space-y-2">
        <Label>Plans</Label>
        <DataTable head={["Plan", "Price", "Notes", "Sources"]}>
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
                {plan.notes ?? <Empty>—</Empty>}
              </Cell>
              <Cell>
                <EvidenceChips ids={plan.evidenceIds} />
              </Cell>
            </Row>
          ))}
        </DataTable>
      </div>

      {data.hiddenCosts.length > 0 ? (
        <div className="space-y-2">
          <Label>Hidden costs</Label>
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
                  {row.notes ?? <Empty>—</Empty>}
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
  const columns =
    data.featureMatrix.length > 0
      ? Object.keys(data.featureMatrix[0].values)
      : []

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        {data.competitors.map((competitor) => (
          <div
            key={competitor.name}
            className="rounded-md border border-border p-3"
          >
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="font-mono text-sm">{competitor.name}</span>
              {competitor.domain ? (
                <span className="font-mono text-xs text-muted-foreground">
                  {competitor.domain}
                </span>
              ) : null}
              <EvidenceChips ids={competitor.evidenceIds} />
            </div>
            {competitor.positioning ? (
              <p className="mt-1 text-sm text-muted-foreground">
                {competitor.positioning}
              </p>
            ) : null}
            <div className="mt-3">
              <TwoUp
                leftLabel="Strengths"
                rightLabel="Weaknesses"
                left={competitor.strengths}
                right={competitor.weaknesses}
              />
            </div>
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
        <Field label="Release cadence">
          <Value>{data.releaseCadence}</Value>
        </Field>
        <Field label="Status page">
          {data.statusPage.present && data.statusPage.url ? (
            <a
              className="font-mono text-sm underline underline-offset-4"
              href={data.statusPage.url}
              target="_blank"
              rel="noreferrer"
            >
              {data.statusPage.url}
            </a>
          ) : (
            <Empty />
          )}
        </Field>
        <Field label="Open source">
          <Value>{data.openSourceSignals}</Value>
        </Field>
        <Field label="Deprecation policy">
          <Value>{data.deprecationPolicy}</Value>
        </Field>
      </div>
      {data.notes.length > 0 ? <Bullets items={data.notes} /> : null}
      <Claims claims={data.claims} />
    </div>
  )
}

function RiskAssessment({ data }: { data: RiskAssessmentData }) {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label>Top risks</Label>
        <ul className="space-y-3">
          {data.topRisks.map((risk) => (
            <li
              key={risk.title}
              className="space-y-1 rounded-md border border-border p-3"
            >
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

      <div className="space-y-2">
        <Label>By category</Label>
        <DataTable head={["Category", "Level", "Rationale", "Sources"]}>
          {data.categories.map((category) => (
            <Row key={category.category}>
              <Cell className="font-mono text-xs whitespace-nowrap">
                {category.category.replace(/_/g, " ")}
              </Cell>
              <Cell>
                <RiskPill level={category.level} />
              </Cell>
              <Cell className="text-muted-foreground">
                {category.rationale}
              </Cell>
              <Cell>
                <EvidenceChips ids={category.evidenceIds} />
              </Cell>
            </Row>
          ))}
        </DataTable>
      </div>

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
        <span className="font-mono text-xs text-muted-foreground">
          {data.confidence}% confidence
        </span>
      </div>
      <div className="space-y-2">
        <Label>Why</Label>
        <Bullets items={data.why} marker="+" />
      </div>
      <div className="space-y-2">
        <Label>Conditions</Label>
        <Bullets items={data.caveats} marker="!" />
      </div>
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
