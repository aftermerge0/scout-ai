import { z } from "zod"

export const EVALUATION_STATUSES = [
  "queued",
  "running",
  "completed",
  "failed",
  "partial",
] as const
export const EvaluationStatus = z.enum(EVALUATION_STATUSES)
export type EvaluationStatus = z.infer<typeof EvaluationStatus>

export const EVALUATION_PHASES = [
  "queued",
  "resolving_entity",
  "collecting_official",
  "collecting_external",
  "analyzing",
  "recommending",
  "done",
  "failed",
] as const
export const EvaluationPhase = z.enum(EVALUATION_PHASES)
export type EvaluationPhase = z.infer<typeof EvaluationPhase>

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
] as const
export const SectionKey = z.enum(SECTION_KEYS)
export type SectionKey = z.infer<typeof SectionKey>

export const SECTION_ORDER = SECTION_KEYS

export const SECTION_TITLES: Record<SectionKey, string> = {
  executive_summary: "Executive Summary",
  company_overview: "Company Overview",
  product_overview: "Product Overview",
  feature_analysis: "Feature Analysis",
  community_sentiment: "Community Sentiment",
  security_compliance: "Security & Compliance",
  pricing_intelligence: "Pricing Intelligence",
  competitor_analysis: "Competitor Analysis",
  engineering_health: "Engineering Health",
  risk_assessment: "Risk Assessment",
  recommendation: "Recommendation",
}

export const SECTION_STATUSES = [
  "pending",
  "running",
  "completed",
  "failed",
] as const
export const SectionStatus = z.enum(SECTION_STATUSES)
export type SectionStatus = z.infer<typeof SectionStatus>

export const PhaseStatus = SectionStatus
export type PhaseStatus = z.infer<typeof PhaseStatus>

export const RecommendationVerdict = z.enum(["yes", "no", "conditional"])
export type RecommendationVerdict = z.infer<typeof RecommendationVerdict>

export const EvidenceSourceType = z.enum(["official", "external"])
export type EvidenceSourceType = z.infer<typeof EvidenceSourceType>

export const RiskLevel = z.enum(["low", "medium", "high", "unknown"])
export type RiskLevel = z.infer<typeof RiskLevel>

export const QualityLevel = z.enum([
  "excellent",
  "good",
  "average",
  "fair",
  "poor",
  "unknown",
])
export type QualityLevel = z.infer<typeof QualityLevel>

export const SentimentLabel = z.enum([
  "positive",
  "neutral",
  "negative",
  "mixed",
])
export type SentimentLabel = z.infer<typeof SentimentLabel>

export const SentimentTrend = z.enum([
  "improving",
  "stable",
  "worsening",
  "unknown",
])
export type SentimentTrend = z.infer<typeof SentimentTrend>

export const ErrorCode = z.enum([
  "VALIDATION_ERROR",
  "NOT_FOUND",
  "ALREADY_EXISTS",
  "RATE_LIMITED",
  "INTERNAL_ERROR",
  "DEPENDENCY_UNAVAILABLE",
  "PIPELINE_FAILED",
])
export type ErrorCode = z.infer<typeof ErrorCode>

export const ApiErrorCode = ErrorCode
export type ApiErrorCode = z.infer<typeof ApiErrorCode>

export const FeaturePresence = z.enum(["yes", "no", "limited", "unknown"])
export type FeaturePresence = z.infer<typeof FeaturePresence>

export const PresenceLevel = FeaturePresence
export type PresenceLevel = z.infer<typeof PresenceLevel>

export const CertificationStatus = z.enum([
  "available",
  "claimed",
  "not_found",
  "unknown",
])
export type CertificationStatus = z.infer<typeof CertificationStatus>

export const ControlStatus = z.enum([
  "supported",
  "limited",
  "not_found",
  "unknown",
])
export type ControlStatus = z.infer<typeof ControlStatus>

export const RelativePrice = z.enum([
  "cheaper",
  "similar",
  "more_expensive",
  "unknown",
])
export type RelativePrice = z.infer<typeof RelativePrice>

export const RiskCategory = z.enum([
  "product",
  "vendor_lock_in",
  "security",
  "scalability",
  "pricing",
  "compliance",
  "company_stability",
])
export type RiskCategory = z.infer<typeof RiskCategory>

export const CompanySize = z.enum(["1-50", "51-200", "201-1000", "1000+"])
export type CompanySize = z.infer<typeof CompanySize>

export const EvidenceIncludeMode = z.enum(["summary", "none", "full"])
export type EvidenceIncludeMode = z.infer<typeof EvidenceIncludeMode>

export const PHASE_ORDER = [
  "resolving_entity",
  "collecting_official",
  "collecting_external",
  "analyzing",
  "recommending",
] as const satisfies readonly EvaluationPhase[]

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

export const TERMINAL_STATUSES = [
  "completed",
  "failed",
  "partial",
] as const satisfies readonly EvaluationStatus[]

export function isTerminal(status: EvaluationStatus): boolean {
  return TERMINAL_STATUSES.includes(
    status as (typeof TERMINAL_STATUSES)[number]
  )
}
