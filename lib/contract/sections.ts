import { z } from "zod"

import {
  CertificationStatus,
  ControlStatus,
  FeaturePresence,
  QualityLevel,
  RecommendationVerdict,
  RelativePrice,
  RiskCategory,
  RiskLevel,
  SECTION_KEYS,
  SentimentLabel,
  SentimentTrend,
  type SectionKey,
} from "@/lib/contract/enums"

const claimSchema = z.object({
  id: z.string(),
  text: z.string(),
  confidence: z.number().min(0).max(100),
  evidenceIds: z.array(z.string()),
})

export const ExecutiveSummaryData = z.object({
  overallScore: z.number().min(0).max(10),
  verdict: RecommendationVerdict,
  confidence: z.number().min(0).max(100),
  headline: z.string(),
  bestSuitedFor: z.array(z.string()),
  avoidIf: z.array(z.string()),
  highlights: z.array(z.string()),
  claims: z.array(claimSchema),
})
export type ExecutiveSummaryData = z.infer<typeof ExecutiveSummaryData>

export const CompanyOverviewData = z.object({
  founded: z.string().nullable(),
  hq: z.string().nullable(),
  employees: z.string().nullable(),
  funding: z.string().nullable(),
  investors: z.array(z.string()),
  estimatedArr: z.string().nullable(),
  customers: z.array(z.string()),
  regions: z.array(z.string()),
  recentGrowth: z.string().nullable(),
  claims: z.array(claimSchema),
})
export type CompanyOverviewData = z.infer<typeof CompanyOverviewData>

export const ProductOverviewData = z.object({
  whatTheySell: z.string(),
  primaryCustomers: z.array(z.string()),
  useCases: z.array(z.string()),
  differentiators: z.array(z.string()),
  coreProducts: z.array(
    z.object({ name: z.string(), description: z.string() })
  ),
  claims: z.array(claimSchema),
})
export type ProductOverviewData = z.infer<typeof ProductOverviewData>

export const FeatureAnalysisData = z.object({
  features: z.array(
    z.object({
      name: z.string(),
      present: FeaturePresence,
      quality: QualityLevel,
      notes: z.string().nullable(),
      evidenceIds: z.array(z.string()),
    })
  ),
  claims: z.array(claimSchema),
})
export type FeatureAnalysisData = z.infer<typeof FeatureAnalysisData>

const themeSchema = z.object({
  theme: z.string(),
  examples: z.array(z.string()),
  evidenceIds: z.array(z.string()),
})

export const CommunitySentimentData = z.object({
  overall: SentimentLabel,
  trend: SentimentTrend,
  positiveThemes: z.array(themeSchema),
  negativeThemes: z.array(themeSchema),
  claims: z.array(claimSchema),
})
export type CommunitySentimentData = z.infer<typeof CommunitySentimentData>

export const SecurityComplianceData = z.object({
  enterpriseReadiness: z.number().min(0).max(100),
  certifications: z.array(
    z.object({
      name: z.string(),
      status: CertificationStatus,
      evidenceIds: z.array(z.string()),
    })
  ),
  controls: z.array(
    z.object({
      name: z.string(),
      status: ControlStatus,
      notes: z.string().nullable(),
      evidenceIds: z.array(z.string()),
    })
  ),
  concerns: z.array(z.string()),
  incidents: z.array(
    z.object({
      title: z.string(),
      date: z.string().nullable(),
      summary: z.string(),
      evidenceIds: z.array(z.string()),
    })
  ),
  claims: z.array(claimSchema),
})
export type SecurityComplianceData = z.infer<typeof SecurityComplianceData>

export const PricingIntelligenceData = z.object({
  model: z.string().nullable(),
  freeTier: z.string().nullable(),
  plans: z.array(
    z.object({
      name: z.string(),
      price: z.string().nullable(),
      unit: z.string().nullable(),
      notes: z.string().nullable(),
      evidenceIds: z.array(z.string()),
    })
  ),
  hiddenCosts: z.array(z.string()),
  estimatedAnnualSpend: z.string().nullable(),
  competitorComparison: z.array(
    z.object({
      competitor: z.string(),
      relativePrice: RelativePrice,
      notes: z.string().nullable(),
    })
  ),
  claims: z.array(claimSchema),
})
export type PricingIntelligenceData = z.infer<typeof PricingIntelligenceData>

const competitorPresenceRows = z.array(
  z.object({
    competitor: z.string(),
    presence: FeaturePresence,
  })
)

// Azure structured outputs reject JSON Schema `propertyNames` from `z.record`.
// The LLM schema accepts rows, then transforms back into the API record shape.
export const CompetitorAnalysisData = z
  .object({
    competitors: z.array(
      z.object({
        name: z.string(),
        domain: z.string().nullable(),
        positioning: z.string().nullable(),
        strengths: z.array(z.string()),
        weaknesses: z.array(z.string()),
        evidenceIds: z.array(z.string()),
      })
    ),
    featureMatrix: z.array(
      z.object({
        feature: z.string(),
        values: competitorPresenceRows,
      })
    ),
    claims: z.array(claimSchema),
  })
  .transform((data) => ({
    ...data,
    featureMatrix: data.featureMatrix.map((row) => ({
      feature: row.feature,
      values: Object.fromEntries(
        row.values.map((value) => [value.competitor, value.presence])
      ) as Record<string, z.infer<typeof FeaturePresence>>,
    })),
  }))
export type CompetitorAnalysisData = z.infer<typeof CompetitorAnalysisData>

export const CompetitorAnalysisApiData = z.object({
  competitors: z.array(
    z.object({
      name: z.string(),
      domain: z.string().nullable(),
      positioning: z.string().nullable(),
      strengths: z.array(z.string()),
      weaknesses: z.array(z.string()),
      evidenceIds: z.array(z.string()),
    })
  ),
  featureMatrix: z.array(
    z.object({
      feature: z.string(),
      values: z.record(z.string(), FeaturePresence),
    })
  ),
  claims: z.array(claimSchema),
}) satisfies z.ZodType<CompetitorAnalysisData>

export const EngineeringHealthData = z.object({
  documentationQuality: QualityLevel,
  apiQuality: QualityLevel,
  sdkMaturity: QualityLevel,
  releaseCadence: z.string().nullable(),
  statusPage: z.object({ present: z.boolean(), url: z.string().nullable() }),
  openSourceSignals: z.string().nullable(),
  deprecationPolicy: z.string().nullable(),
  notes: z.array(z.string()),
  claims: z.array(claimSchema),
})
export type EngineeringHealthData = z.infer<typeof EngineeringHealthData>

export const RiskAssessmentData = z.object({
  categories: z.array(
    z.object({
      category: RiskCategory,
      level: RiskLevel,
      rationale: z.string(),
      evidenceIds: z.array(z.string()),
    })
  ),
  topRisks: z.array(
    z.object({
      title: z.string(),
      severity: RiskLevel,
      summary: z.string(),
      evidenceIds: z.array(z.string()),
    })
  ),
  claims: z.array(claimSchema),
})
export type RiskAssessmentData = z.infer<typeof RiskAssessmentData>

export const RecommendationData = z.object({
  adopt: RecommendationVerdict,
  confidence: z.number().min(0).max(100),
  why: z.array(z.string()),
  caveats: z.array(z.string()),
  bestSuitedFor: z.array(z.string()),
  avoidIf: z.array(z.string()),
  overallScore: z.number().min(0).max(10),
  claims: z.array(claimSchema),
})
export type RecommendationData = z.infer<typeof RecommendationData>

export const SECTION_SCHEMAS = {
  executive_summary: ExecutiveSummaryData,
  company_overview: CompanyOverviewData,
  product_overview: ProductOverviewData,
  feature_analysis: FeatureAnalysisData,
  community_sentiment: CommunitySentimentData,
  security_compliance: SecurityComplianceData,
  pricing_intelligence: PricingIntelligenceData,
  competitor_analysis: CompetitorAnalysisData,
  engineering_health: EngineeringHealthData,
  risk_assessment: RiskAssessmentData,
  recommendation: RecommendationData,
} satisfies Record<SectionKey, z.ZodType>

export const SECTION_DATA_SCHEMAS = {
  ...SECTION_SCHEMAS,
  competitor_analysis: CompetitorAnalysisApiData,
} satisfies Record<SectionKey, z.ZodType>

export type SectionDataByKey = {
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

export type SectionDataMap = SectionDataByKey
export type SectionData = SectionDataByKey[SectionKey]

export const CONTRACT_SECTION_COUNT = SECTION_KEYS.length
