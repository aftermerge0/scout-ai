import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from "drizzle-orm/zod"
import { z } from "zod"

import {
  evaluations,
  evidence,
  findings,
  reportSections,
} from "@/lib/db/schema"
import {
  ApiError,
  EvaluationContext,
  ProgressDto,
  SummaryDto,
} from "@/lib/contract/api"
import {
  EvaluationPhase,
  EvaluationStatus,
  EvidenceSourceType,
  RecommendationVerdict,
  RiskLevel,
  SectionKey,
  SectionStatus,
} from "@/lib/contract/enums"
import { SECTION_DATA_SCHEMAS, type SectionData } from "@/lib/contract/sections"

const refinedColumn =
  <T extends z.ZodType>(schema: T) =>
  () =>
    schema
const boundedPercent = (schema: z.ZodNumber) => schema.min(0).max(100)

const sectionDataJson = z.union([
  SECTION_DATA_SCHEMAS.executive_summary,
  SECTION_DATA_SCHEMAS.company_overview,
  SECTION_DATA_SCHEMAS.product_overview,
  SECTION_DATA_SCHEMAS.feature_analysis,
  SECTION_DATA_SCHEMAS.community_sentiment,
  SECTION_DATA_SCHEMAS.security_compliance,
  SECTION_DATA_SCHEMAS.pricing_intelligence,
  SECTION_DATA_SCHEMAS.competitor_analysis,
  SECTION_DATA_SCHEMAS.engineering_health,
  SECTION_DATA_SCHEMAS.risk_assessment,
  SECTION_DATA_SCHEMAS.recommendation,
]) satisfies z.ZodType<SectionData>

const evaluationRefinements = {
  status: refinedColumn(EvaluationStatus),
  phase: refinedColumn(EvaluationPhase),
  contextJson: refinedColumn(EvaluationContext),
  summaryJson: refinedColumn(SummaryDto),
  errorJson: refinedColumn(ApiError),
  progressJson: refinedColumn(ProgressDto),
  overallScore: (schema: z.ZodNumber) => schema.min(0).max(10),
  verdict: refinedColumn(RecommendationVerdict),
  confidence: boundedPercent,
}

const evidenceRefinements = {
  sourceType: refinedColumn(EvidenceSourceType),
}

const reportSectionRefinements = {
  key: refinedColumn(SectionKey),
  status: refinedColumn(SectionStatus),
  confidence: boundedPercent,
  dataJson: refinedColumn(sectionDataJson),
  errorJson: refinedColumn(ApiError),
}

const findingRefinements = {
  severity: refinedColumn(RiskLevel),
  confidence: boundedPercent,
  sectionKey: refinedColumn(SectionKey),
}

export const DRIZZLE_ZOD_ROW_SCHEMAS_READY = true

export const EvaluationSelect = createSelectSchema(
  evaluations,
  evaluationRefinements
)
export const EvaluationInsert = createInsertSchema(
  evaluations,
  evaluationRefinements
)
export const EvaluationUpdate = createUpdateSchema(
  evaluations,
  evaluationRefinements
)

export const EvidenceSelect = createSelectSchema(evidence, evidenceRefinements)
export const EvidenceInsert = createInsertSchema(evidence, evidenceRefinements)
export const EvidenceUpdate = createUpdateSchema(evidence, evidenceRefinements)

export const ReportSectionSelect = createSelectSchema(
  reportSections,
  reportSectionRefinements
)
export const ReportSectionInsert = createInsertSchema(
  reportSections,
  reportSectionRefinements
)
export const ReportSectionUpdate = createUpdateSchema(
  reportSections,
  reportSectionRefinements
)

export const FindingSelect = createSelectSchema(findings, findingRefinements)
export const FindingInsert = createInsertSchema(findings, findingRefinements)
export const FindingUpdate = createUpdateSchema(findings, findingRefinements)

export type EvaluationSelect = z.infer<typeof EvaluationSelect>
export type EvaluationInsert = z.infer<typeof EvaluationInsert>
export type EvaluationUpdate = z.infer<typeof EvaluationUpdate>
export type EvidenceSelect = z.infer<typeof EvidenceSelect>
export type EvidenceInsert = z.infer<typeof EvidenceInsert>
export type EvidenceUpdate = z.infer<typeof EvidenceUpdate>
export type ReportSectionSelect = z.infer<typeof ReportSectionSelect>
export type ReportSectionInsert = z.infer<typeof ReportSectionInsert>
export type ReportSectionUpdate = z.infer<typeof ReportSectionUpdate>
export type FindingSelect = z.infer<typeof FindingSelect>
export type FindingInsert = z.infer<typeof FindingInsert>
export type FindingUpdate = z.infer<typeof FindingUpdate>
