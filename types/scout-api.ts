/**
 * Shapes copied from docs/API_CONTRACT.md (v1, frozen for MVP).
 * Backend will later publish identical types; until then this file is the FE mirror.
 */

export type EvaluationStatus =
  "queued" | "running" | "completed" | "failed" | "partial"

export type EvaluationPhase =
  | "queued"
  | "resolving_entity"
  | "collecting_official"
  | "collecting_external"
  | "analyzing"
  | "recommending"
  | "done"
  | "failed"

export type SectionKey =
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
  | "recommendation"

export type SectionStatus = "pending" | "running" | "completed" | "failed"

export type RecommendationVerdict = "yes" | "no" | "conditional"

export type EvidenceSourceType = "official" | "external"

export type RiskLevel = "low" | "medium" | "high" | "unknown"

export type QualityLevel =
  "excellent" | "good" | "average" | "fair" | "poor" | "unknown"

export type SentimentLabel = "positive" | "neutral" | "negative" | "mixed"

export type PresenceLevel = "yes" | "no" | "limited" | "unknown"

/** Frontend MUST render sections in this order (contract §2). */
export const SECTION_ORDER = [
  "executive_summary",
  "company_overview",
  "product_overview",
  "feature_analysis",
  "community_sentiment",
  "security_compliance",
  "pricing_intelligence",
  "competitor_analysis",
  "engineering_health",
  "risk_assessment",
  "recommendation",
] as const satisfies readonly SectionKey[]

export const PHASE_ORDER = [
  "resolving_entity",
  "collecting_official",
  "collecting_external",
  "analyzing",
  "recommending",
] as const satisfies readonly EvaluationPhase[]

export const SECTION_TITLES: Record<SectionKey, string> = {
  executive_summary: "Executive Summary",
  company_overview: "Company Overview",
  product_overview: "Product Overview",
  feature_analysis: "Feature Analysis",
  community_sentiment: "Reviews & Sentiment",
  security_compliance: "Security & Compliance",
  pricing_intelligence: "Pricing Intelligence",
  competitor_analysis: "Competitor Analysis",
  engineering_health: "Engineering Health",
  risk_assessment: "Risk Assessment",
  recommendation: "Recommendation",
}

export const PHASE_TITLES: Record<EvaluationPhase, string> = {
  queued: "Queued",
  resolving_entity: "Resolving entity",
  collecting_official: "Collecting official sources",
  collecting_external: "Collecting third-party signals",
  analyzing: "Analyzing",
  recommending: "Recommending",
  done: "Done",
  failed: "Failed",
}

// --- Errors -----------------------------------------------------------------

export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "ALREADY_EXISTS"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR"
  | "DEPENDENCY_UNAVAILABLE"

export type ApiErrorBody = {
  error: {
    code: ApiErrorCode | string
    message: string
    details?: Record<string, unknown>
  }
}

export type EvaluationError = {
  code: string
  message: string
  phase: EvaluationPhase | null
}

// --- Core resources ---------------------------------------------------------

export type Claim = {
  id: string
  text: string
  confidence: number // 0-100
  evidenceIds: string[]
}

export type Evidence = {
  id: string
  sourceType: EvidenceSourceType
  url: string
  title: string
  domain: string
  snippet: string
  fetchedAt: string
}

export type Finding = {
  id: string
  category: string
  severity: "low" | "medium" | "high"
  title: string
  summary: string
  confidence: number
  evidenceIds: string[]
  sectionKey: SectionKey
}

export type EvaluationProgress = {
  percent: number
  phase: EvaluationPhase
  phases: Array<{ key: EvaluationPhase; status: SectionStatus }>
  sectionsCompleted: number
  sectionsTotal: number
}

export type EvaluationSummary = {
  overallScore: number | null
  verdict: RecommendationVerdict | null
  confidence: number | null
  headline: string | null
  bestSuitedFor: string[]
  avoidIf: string[]
}

export type EvaluationContext = {
  useCase?: string
  companySize?: "1-50" | "51-200" | "201-1000" | "1000+"
  priorities?: string[]
}

// --- Section payloads (contract §8) -----------------------------------------

export type ExecutiveSummaryData = {
  overallScore: number
  verdict: RecommendationVerdict
  confidence: number
  headline: string
  bestSuitedFor: string[]
  avoidIf: string[]
  highlights: string[]
  claims: Claim[]
}

export type FounderProfile = {
  name: string
  role: string | null
  background: string | null
  evidenceIds: string[]
}

export type CompanyOverviewData = {
  founded: string | null
  hq: string | null
  employees: string | null
  funding: string | null
  investors: string[]
  estimatedArr: string | null
  customers: string[]
  regions: string[]
  recentGrowth: string | null
  /** Founders / co-founders / CEO when named in evidence. */
  founders: FounderProfile[]
  claims: Claim[]
}

export type ProductOverviewData = {
  whatTheySell: string
  primaryCustomers: string[]
  useCases: string[]
  differentiators: string[]
  coreProducts: Array<{ name: string; description: string }>
  claims: Claim[]
}

export type FeatureAnalysisData = {
  features: Array<{
    name: string
    present: PresenceLevel
    quality: QualityLevel
    notes: string | null
    evidenceIds: string[]
  }>
  claims: Claim[]
}

export type ReviewSource =
  | "glassdoor"
  | "ambitionbox"
  | "g2"
  | "capterra"
  | "linkedin"
  | "trustpilot"
  | "other"

export type ReviewSourceSummary = {
  source: ReviewSource
  sourceLabel: string
  rating: string | null
  reviewCount: string | null
  summary: string | null
  pros: string[]
  cons: string[]
  sampleQuotes: string[]
  url: string | null
  evidenceIds: string[]
}

export type CommunitySentimentData = {
  overall: SentimentLabel
  trend: "improving" | "stable" | "worsening" | "unknown"
  positiveThemes: Array<{
    theme: string
    examples: string[]
    evidenceIds: string[]
  }>
  negativeThemes: Array<{
    theme: string
    examples: string[]
    evidenceIds: string[]
  }>
  /** Aggregated employee/customer reviews from Glassdoor, AmbitionBox, G2, etc. */
  reviews: ReviewSourceSummary[]
  claims: Claim[]
}

export type SecurityComplianceData = {
  enterpriseReadiness: number // 0-100
  certifications: Array<{
    name: string
    status: "available" | "claimed" | "not_found" | "unknown"
    evidenceIds: string[]
  }>
  controls: Array<{
    name: string
    status: "supported" | "limited" | "not_found" | "unknown"
    notes: string | null
    evidenceIds: string[]
  }>
  concerns: string[]
  incidents: Array<{
    title: string
    date: string | null
    summary: string
    evidenceIds: string[]
  }>
  claims: Claim[]
}

export type PricingIntelligenceData = {
  model: string | null
  freeTier: string | null
  plans: Array<{
    name: string
    price: string | null
    unit: string | null
    notes: string | null
    evidenceIds: string[]
  }>
  hiddenCosts: string[]
  estimatedAnnualSpend: string | null
  competitorComparison: Array<{
    competitor: string
    relativePrice: "cheaper" | "similar" | "more_expensive" | "unknown"
    notes: string | null
  }>
  claims: Claim[]
}

export type CompetitorAnalysisData = {
  competitors: Array<{
    name: string
    domain: string | null
    positioning: string | null
    strengths: string[]
    weaknesses: string[]
    evidenceIds: string[]
  }>
  featureMatrix: Array<{
    feature: string
    values: Record<string, PresenceLevel>
  }>
  claims: Claim[]
}

export type EngineeringHealthData = {
  documentationQuality: QualityLevel
  apiQuality: QualityLevel
  sdkMaturity: QualityLevel
  releaseCadence: string | null
  statusPage: { present: boolean; url: string | null }
  openSourceSignals: string | null
  deprecationPolicy: string | null
  notes: string[]
  claims: Claim[]
}

export type RiskAssessmentData = {
  categories: Array<{
    category:
      | "product"
      | "vendor_lock_in"
      | "security"
      | "scalability"
      | "pricing"
      | "compliance"
      | "company_stability"
    level: RiskLevel
    rationale: string
    evidenceIds: string[]
  }>
  topRisks: Array<{
    title: string
    severity: RiskLevel
    summary: string
    evidenceIds: string[]
  }>
  claims: Claim[]
}

export type RecommendationData = {
  adopt: RecommendationVerdict
  confidence: number
  why: string[]
  caveats: string[]
  bestSuitedFor: string[]
  avoidIf: string[]
  overallScore: number
  claims: Claim[]
}

/** Maps each section key to its completed `data` payload. */
export type SectionDataMap = {
  executive_summary: ExecutiveSummaryData
  company_overview: CompanyOverviewData
  product_overview: ProductOverviewData
  feature_analysis: FeatureAnalysisData
  community_sentiment: CommunitySentimentData
  security_compliance: SecurityComplianceData
  pricing_intelligence: PricingIntelligenceData
  competitor_analysis: CompetitorAnalysisData
  engineering_health: EngineeringHealthData
  risk_assessment: RiskAssessmentData
  recommendation: RecommendationData
}

/** `data` is null unless `status === "completed"`. */
export type Section<K extends SectionKey = SectionKey> = {
  key: K
  title: string
  status: SectionStatus
  confidence: number | null
  updatedAt: string | null
  error: { code: string; message: string } | null
  data: SectionDataMap[K] | null
}

export type AnySection = { [K in SectionKey]: Section<K> }[SectionKey]

// --- Endpoint payloads ------------------------------------------------------

export type Evaluation = {
  id: string
  status: EvaluationStatus
  phase: EvaluationPhase
  input: string
  normalizedUrl: string | null
  companyName: string | null
  domain: string | null
  createdAt: string
  updatedAt: string
  completedAt: string | null
  error: EvaluationError | null
  progress: EvaluationProgress
  summary: EvaluationSummary
  sections: AnySection[]
  findings: Finding[]
  evidence: Evidence[]
  poll: {
    shouldPoll: boolean
    pollAfterMs: number
    etag: string | null
  }
}

export type CreatedEvaluation = {
  id: string
  status: EvaluationStatus
  phase: EvaluationPhase
  input: string
  normalizedUrl: string | null
  companyName: string | null
  domain: string | null
  createdAt: string
  reportUrl: string
  pollAfterMs: number
}

export type EvidencePage = {
  items: Evidence[]
  nextCursor: string | null
}

export const TERMINAL_STATUSES: readonly EvaluationStatus[] = [
  "completed",
  "failed",
  "partial",
]

export function isTerminal(status: EvaluationStatus): boolean {
  return TERMINAL_STATUSES.includes(status)
}
