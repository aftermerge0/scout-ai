import { z } from "zod";

import type { SectionDataByKey, SectionKey } from "@/lib/api-types";

/**
 * Zod schemas for each section's `data` payload (API_CONTRACT.md §8), used
 * as the `schema` passed to `generateObject` for structured Azure OpenAI
 * output. Each schema's inferred type matches the corresponding
 * `SectionDataByKey[K]` contract type exactly.
 */

const claimSchema = z.object({
  id: z.string(),
  text: z.string(),
  confidence: z.number().min(0).max(100),
  evidenceIds: z.array(z.string()),
});

const featurePresence = z.enum(["yes", "no", "limited", "unknown"]);
const qualityLevel = z.enum(["excellent", "good", "average", "fair", "poor", "unknown"]);
const riskLevel = z.enum(["low", "medium", "high", "unknown"]);

const executiveSummarySchema = z.object({
  overallScore: z.number().min(0).max(10),
  verdict: z.enum(["yes", "no", "conditional"]),
  confidence: z.number().min(0).max(100),
  headline: z.string(),
  bestSuitedFor: z.array(z.string()),
  avoidIf: z.array(z.string()),
  highlights: z.array(z.string()),
  claims: z.array(claimSchema),
}) satisfies z.ZodType<SectionDataByKey["executive_summary"]>;

const companyOverviewSchema = z.object({
  founded: z.string().nullable(),
  hq: z.string().nullable(),
  employees: z.string().nullable(),
  funding: z.string().nullable(),
  investors: z.array(z.string()),
  estimatedArr: z.string().nullable(),
  customers: z.array(z.string()),
  regions: z.array(z.string()),
  recentGrowth: z.string().nullable(),
  founders: z.array(
    z.object({
      name: z.string(),
      role: z.string().nullable(),
      background: z.string().nullable(),
      evidenceIds: z.array(z.string()),
    }),
  ),
  claims: z.array(claimSchema),
}) satisfies z.ZodType<SectionDataByKey["company_overview"]>;

const productOverviewSchema = z.object({
  whatTheySell: z.string(),
  primaryCustomers: z.array(z.string()),
  useCases: z.array(z.string()),
  differentiators: z.array(z.string()),
  coreProducts: z.array(z.object({ name: z.string(), description: z.string() })),
  claims: z.array(claimSchema),
}) satisfies z.ZodType<SectionDataByKey["product_overview"]>;

const featureAnalysisSchema = z.object({
  features: z.array(
    z.object({
      name: z.string(),
      present: featurePresence,
      quality: qualityLevel,
      notes: z.string().nullable(),
      evidenceIds: z.array(z.string()),
    }),
  ),
  claims: z.array(claimSchema),
}) satisfies z.ZodType<SectionDataByKey["feature_analysis"]>;

const themeSchema = z.object({
  theme: z.string(),
  examples: z.array(z.string()),
  evidenceIds: z.array(z.string()),
});

const communitySentimentSchema = z.object({
  overall: z.enum(["positive", "neutral", "negative", "mixed"]),
  trend: z.enum(["improving", "stable", "worsening", "unknown"]),
  positiveThemes: z.array(themeSchema),
  negativeThemes: z.array(themeSchema),
  reviews: z.array(
    z.object({
      source: z.enum([
        "glassdoor",
        "ambitionbox",
        "g2",
        "capterra",
        "linkedin",
        "trustpilot",
        "other",
      ]),
      sourceLabel: z.string(),
      rating: z.string().nullable(),
      reviewCount: z.string().nullable(),
      summary: z.string().nullable(),
      pros: z.array(z.string()),
      cons: z.array(z.string()),
      sampleQuotes: z.array(z.string()),
      url: z.string().nullable(),
      evidenceIds: z.array(z.string()),
    }),
  ),
  claims: z.array(claimSchema),
}) satisfies z.ZodType<SectionDataByKey["community_sentiment"]>;

const securityComplianceSchema = z.object({
  enterpriseReadiness: z.number().min(0).max(100),
  certifications: z.array(
    z.object({
      name: z.string(),
      status: z.enum(["available", "claimed", "not_found", "unknown"]),
      evidenceIds: z.array(z.string()),
    }),
  ),
  controls: z.array(
    z.object({
      name: z.string(),
      status: z.enum(["supported", "limited", "not_found", "unknown"]),
      notes: z.string().nullable(),
      evidenceIds: z.array(z.string()),
    }),
  ),
  concerns: z.array(z.string()),
  incidents: z.array(
    z.object({
      title: z.string(),
      date: z.string().nullable(),
      summary: z.string(),
      evidenceIds: z.array(z.string()),
    }),
  ),
  claims: z.array(claimSchema),
}) satisfies z.ZodType<SectionDataByKey["security_compliance"]>;

const pricingIntelligenceSchema = z.object({
  model: z.string().nullable(),
  freeTier: z.string().nullable(),
  plans: z.array(
    z.object({
      name: z.string(),
      price: z.string().nullable(),
      unit: z.string().nullable(),
      notes: z.string().nullable(),
      evidenceIds: z.array(z.string()),
    }),
  ),
  hiddenCosts: z.array(z.string()),
  estimatedAnnualSpend: z.string().nullable(),
  competitorComparison: z.array(
    z.object({
      competitor: z.string(),
      relativePrice: z.enum(["cheaper", "similar", "more_expensive", "unknown"]),
      notes: z.string().nullable(),
    }),
  ),
  claims: z.array(claimSchema),
}) satisfies z.ZodType<SectionDataByKey["pricing_intelligence"]>;

// Azure structured outputs reject JSON Schema `propertyNames` from `z.record`.
// Model emits competitor/presence rows; transform restores contract `Record` shape.
const competitorAnalysisSchema = z
  .object({
    competitors: z.array(
      z.object({
        name: z.string(),
        domain: z.string().nullable(),
        positioning: z.string().nullable(),
        strengths: z.array(z.string()),
        weaknesses: z.array(z.string()),
        evidenceIds: z.array(z.string()),
      }),
    ),
    featureMatrix: z.array(
      z.object({
        feature: z.string(),
        values: z.array(
          z.object({
            competitor: z.string(),
            presence: featurePresence,
          }),
        ),
      }),
    ),
    claims: z.array(claimSchema),
  })
  .transform((data): SectionDataByKey["competitor_analysis"] => ({
    ...data,
    featureMatrix: data.featureMatrix.map((row) => ({
      feature: row.feature,
      values: Object.fromEntries(row.values.map((v) => [v.competitor, v.presence])),
    })),
  }));

const engineeringHealthSchema = z.object({
  documentationQuality: qualityLevel,
  apiQuality: qualityLevel,
  sdkMaturity: qualityLevel,
  releaseCadence: z.string().nullable(),
  statusPage: z.object({ present: z.boolean(), url: z.string().nullable() }),
  openSourceSignals: z.string().nullable(),
  deprecationPolicy: z.string().nullable(),
  notes: z.array(z.string()),
  claims: z.array(claimSchema),
}) satisfies z.ZodType<SectionDataByKey["engineering_health"]>;

const riskAssessmentSchema = z.object({
  categories: z.array(
    z.object({
      category: z.enum([
        "product",
        "vendor_lock_in",
        "security",
        "scalability",
        "pricing",
        "compliance",
        "company_stability",
      ]),
      level: riskLevel,
      rationale: z.string(),
      evidenceIds: z.array(z.string()),
    }),
  ),
  topRisks: z.array(
    z.object({
      title: z.string(),
      severity: riskLevel,
      summary: z.string(),
      evidenceIds: z.array(z.string()),
    }),
  ),
  claims: z.array(claimSchema),
}) satisfies z.ZodType<SectionDataByKey["risk_assessment"]>;

const recommendationSchema = z.object({
  adopt: z.enum(["yes", "no", "conditional"]),
  confidence: z.number().min(0).max(100),
  why: z.array(z.string()),
  caveats: z.array(z.string()),
  bestSuitedFor: z.array(z.string()),
  avoidIf: z.array(z.string()),
  overallScore: z.number().min(0).max(10),
  claims: z.array(claimSchema),
}) satisfies z.ZodType<SectionDataByKey["recommendation"]>;

export const SECTION_SCHEMAS = {
  executive_summary: executiveSummarySchema,
  company_overview: companyOverviewSchema,
  product_overview: productOverviewSchema,
  feature_analysis: featureAnalysisSchema,
  community_sentiment: communitySentimentSchema,
  security_compliance: securityComplianceSchema,
  pricing_intelligence: pricingIntelligenceSchema,
  competitor_analysis: competitorAnalysisSchema,
  engineering_health: engineeringHealthSchema,
  risk_assessment: riskAssessmentSchema,
  recommendation: recommendationSchema,
} satisfies Record<SectionKey, z.ZodType>;
