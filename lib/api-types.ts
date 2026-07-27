/**
 * Shared contract types for Scout's /api/v1 surface.
 *
 * Source of truth: docs/API_CONTRACT.md
 * Keep this file and the contract doc in sync. Additive changes only for MVP;
 * breaking changes require a version bump or explicit frontend sync.
 */

export type EvaluationStatus = "queued" | "running" | "completed" | "failed" | "partial";

export type EvaluationPhase =
  | "queued"
  | "resolving_entity"
  | "collecting_official"
  | "collecting_external"
  | "analyzing"
  | "recommending"
  | "done"
  | "failed";

export const SECTION_KEYS = [
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
] as const;

export type SectionKey = (typeof SECTION_KEYS)[number];

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
};

export type SectionStatus = "pending" | "running" | "completed" | "failed";

export type RecommendationVerdict = "yes" | "no" | "conditional";

export type EvidenceSourceType = "official" | "external";

export type RiskLevel = "low" | "medium" | "high" | "unknown";

export type QualityLevel = "excellent" | "good" | "average" | "fair" | "poor" | "unknown";

export type SentimentLabel = "positive" | "neutral" | "negative" | "mixed";

export type ErrorCode =
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "ALREADY_EXISTS"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR"
  | "DEPENDENCY_UNAVAILABLE"
  | "PIPELINE_FAILED";

export type ApiError = {
  code: ErrorCode;
  message: string;
  details?: Record<string, unknown>;
  phase?: EvaluationPhase;
};

export type ApiErrorBody = { error: ApiError };
export type ApiOkBody<T> = { data: T };

export type Claim = {
  id: string;
  text: string;
  confidence: number;
  evidenceIds: string[];
};

export type EvidenceItem = {
  id: string;
  sourceType: EvidenceSourceType;
  url: string;
  title: string | null;
  domain: string | null;
  snippet: string | null;
  fetchedAt: string;
};

export type Finding = {
  id: string;
  category: string;
  severity: RiskLevel;
  title: string;
  summary: string;
  confidence: number;
  evidenceIds: string[];
  sectionKey: SectionKey;
};

// ---- Section `data` payloads (see API_CONTRACT.md §8) ----

export type ExecutiveSummaryData = {
  overallScore: number;
  verdict: RecommendationVerdict;
  confidence: number;
  headline: string;
  bestSuitedFor: string[];
  avoidIf: string[];
  highlights: string[];
  claims: Claim[];
};

export type FounderProfile = {
  name: string;
  role: string | null;
  background: string | null;
  evidenceIds: string[];
};

export type CompanyOverviewData = {
  founded: string | null;
  hq: string | null;
  employees: string | null;
  funding: string | null;
  investors: string[];
  estimatedArr: string | null;
  customers: string[];
  regions: string[];
  recentGrowth: string | null;
  /** Founders / co-founders / CEO when named in evidence. */
  founders: FounderProfile[];
  claims: Claim[];
};

export type ProductOverviewData = {
  whatTheySell: string;
  primaryCustomers: string[];
  useCases: string[];
  differentiators: string[];
  coreProducts: Array<{ name: string; description: string }>;
  claims: Claim[];
};

export type FeaturePresence = "yes" | "no" | "limited" | "unknown";

export type FeatureAnalysisData = {
  features: Array<{
    name: string;
    present: FeaturePresence;
    quality: QualityLevel;
    notes: string | null;
    evidenceIds: string[];
  }>;
  claims: Claim[];
};

export type ReviewSource =
  | "glassdoor"
  | "ambitionbox"
  | "g2"
  | "capterra"
  | "linkedin"
  | "trustpilot"
  | "other";

export type ReviewSourceSummary = {
  source: ReviewSource;
  sourceLabel: string;
  rating: string | null;
  reviewCount: string | null;
  summary: string | null;
  pros: string[];
  cons: string[];
  sampleQuotes: string[];
  url: string | null;
  evidenceIds: string[];
};

export type CommunitySentimentData = {
  overall: SentimentLabel;
  trend: "improving" | "stable" | "worsening" | "unknown";
  positiveThemes: Array<{ theme: string; examples: string[]; evidenceIds: string[] }>;
  negativeThemes: Array<{ theme: string; examples: string[]; evidenceIds: string[] }>;
  /** Aggregated employee/customer reviews from Glassdoor, AmbitionBox, G2, etc. */
  reviews: ReviewSourceSummary[];
  claims: Claim[];
};

export type CertificationStatus = "available" | "claimed" | "not_found" | "unknown";
export type ControlStatus = "supported" | "limited" | "not_found" | "unknown";

export type SecurityComplianceData = {
  enterpriseReadiness: number;
  certifications: Array<{
    name: string;
    status: CertificationStatus;
    evidenceIds: string[];
  }>;
  controls: Array<{
    name: string;
    status: ControlStatus;
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

export type RelativePrice = "cheaper" | "similar" | "more_expensive" | "unknown";

export type PricingIntelligenceData = {
  model: string | null;
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
    relativePrice: RelativePrice;
    notes: string | null;
  }>;
  claims: Claim[];
};

export type CompetitorAnalysisData = {
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
    values: Record<string, FeaturePresence>;
  }>;
  claims: Claim[];
};

export type EngineeringHealthData = {
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

export type RiskCategory =
  | "product"
  | "vendor_lock_in"
  | "security"
  | "scalability"
  | "pricing"
  | "compliance"
  | "company_stability";

export type RiskAssessmentData = {
  categories: Array<{
    category: RiskCategory;
    level: RiskLevel;
    rationale: string;
    evidenceIds: string[];
  }>;
  topRisks: Array<{
    title: string;
    severity: RiskLevel;
    summary: string;
    evidenceIds: string[];
  }>;
  claims: Claim[];
};

export type RecommendationData = {
  adopt: RecommendationVerdict;
  confidence: number;
  why: string[];
  caveats: string[];
  bestSuitedFor: string[];
  avoidIf: string[];
  overallScore: number;
  claims: Claim[];
};

export type SectionDataByKey = {
  executive_summary: ExecutiveSummaryData;
  company_overview: CompanyOverviewData;
  product_overview: ProductOverviewData;
  feature_analysis: FeatureAnalysisData;
  community_sentiment: CommunitySentimentData;
  security_compliance: SecurityComplianceData;
  pricing_intelligence: PricingIntelligenceData;
  competitor_analysis: CompetitorAnalysisData;
  engineering_health: EngineeringHealthData;
  risk_assessment: RiskAssessmentData;
  recommendation: RecommendationData;
};

export type SectionData = SectionDataByKey[SectionKey];

export type ReportSectionDto<K extends SectionKey = SectionKey> = {
  key: K;
  title: string;
  status: SectionStatus;
  confidence: number | null;
  updatedAt: string | null;
  error: ApiError | null;
  data: SectionDataByKey[K] | null;
};

export type PhaseStatus = "pending" | "running" | "completed" | "failed";

export type ProgressDto = {
  percent: number;
  phase: EvaluationPhase;
  phases: Array<{ key: EvaluationPhase; status: PhaseStatus }>;
  sectionsCompleted: number;
  sectionsTotal: number;
};

export type SummaryDto = {
  overallScore: number | null;
  verdict: RecommendationVerdict | null;
  confidence: number | null;
  headline: string | null;
  bestSuitedFor: string[];
  avoidIf: string[];
};

export type PollDto = {
  shouldPoll: boolean;
  pollAfterMs: number;
  etag: string;
};

export type EvaluationDto = {
  id: string;
  status: EvaluationStatus;
  phase: EvaluationPhase;
  input: string;
  normalizedUrl: string | null;
  companyName: string | null;
  domain: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  error: ApiError | null;
  progress: ProgressDto;
  summary: SummaryDto;
  sections: ReportSectionDto[];
  findings: Finding[];
  evidence: EvidenceItem[];
  poll: PollDto;
};

export type CreateEvaluationResponse = {
  id: string;
  status: EvaluationStatus;
  phase: EvaluationPhase;
  input: string;
  normalizedUrl: string | null;
  companyName: string | null;
  domain: string | null;
  createdAt: string;
  reportUrl: string;
  pollAfterMs: number;
};

export type CompanySize = "1-50" | "51-200" | "201-1000" | "1000+";

export type EvaluationContext = {
  useCase?: string;
  companySize?: CompanySize;
  priorities?: string[];
};

export type CreateEvaluationRequest = {
  input: string;
  context?: EvaluationContext;
};

export type EvidenceIncludeMode = "summary" | "none" | "full";
