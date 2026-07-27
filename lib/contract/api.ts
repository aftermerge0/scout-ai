import { z } from "zod"

import {
  CompanySize,
  ErrorCode,
  EvaluationPhase,
  EvaluationStatus,
  EvidenceSourceType,
  PhaseStatus,
  RecommendationVerdict,
  RiskLevel,
  SectionKey,
  SectionStatus,
  type SectionKey as SectionKeyType,
} from "@/lib/contract/enums"
import {
  SECTION_DATA_SCHEMAS,
  type SectionDataByKey,
} from "@/lib/contract/sections"

const jsonObject = z.record(z.string(), z.unknown())
const isoDateString = z.string()
const confidence = z.number().min(0).max(100)

export const ApiError = z.object({
  code: ErrorCode,
  message: z.string(),
  details: jsonObject.optional(),
  phase: EvaluationPhase.optional(),
})
export type ApiError = z.infer<typeof ApiError>

export const ApiErrorBody = z.object({
  error: ApiError,
})
export type ApiErrorBody = z.infer<typeof ApiErrorBody>

export function ApiOkBody<T extends z.ZodType>(data: T) {
  return z.object({ data })
}
export type ApiOkBody<T> = { data: T }

export const Claim = z.object({
  id: z.string(),
  text: z.string(),
  confidence,
  evidenceIds: z.array(z.string()),
})
export type Claim = z.infer<typeof Claim>

export const EvidenceItem = z.object({
  id: z.string(),
  sourceType: EvidenceSourceType,
  url: z.string(),
  title: z.string().nullable(),
  domain: z.string().nullable(),
  snippet: z.string().nullable(),
  fetchedAt: isoDateString,
})
export type EvidenceItem = z.infer<typeof EvidenceItem>

export const Finding = z.object({
  id: z.string(),
  category: z.string(),
  severity: RiskLevel,
  title: z.string(),
  summary: z.string(),
  confidence,
  evidenceIds: z.array(z.string()),
  sectionKey: SectionKey,
})
export type Finding = z.infer<typeof Finding>

export const ProgressDto = z.object({
  percent: z.number().min(0).max(100),
  phase: EvaluationPhase,
  phases: z.array(z.object({ key: EvaluationPhase, status: PhaseStatus })),
  sectionsCompleted: z.number().int().min(0),
  sectionsTotal: z.number().int().min(0),
})
export type ProgressDto = z.infer<typeof ProgressDto>

export const SummaryDto = z.object({
  overallScore: z.number().min(0).max(10).nullable(),
  verdict: RecommendationVerdict.nullable(),
  confidence: confidence.nullable(),
  headline: z.string().nullable(),
  bestSuitedFor: z.array(z.string()),
  avoidIf: z.array(z.string()),
})
export type SummaryDto = z.infer<typeof SummaryDto>

export const PollDto = z.object({
  shouldPoll: z.boolean(),
  pollAfterMs: z.number().int().min(0),
  etag: z.string(),
})
export type PollDto = z.infer<typeof PollDto>

const sectionDataSchema = z.union([
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
])

export const ReportSectionDto = z.object({
  key: SectionKey,
  title: z.string(),
  status: SectionStatus,
  confidence: confidence.nullable(),
  updatedAt: isoDateString.nullable(),
  error: ApiError.nullable(),
  data: sectionDataSchema.nullable(),
})
type ReportSectionDtoFromSchema = z.infer<typeof ReportSectionDto>
export type ReportSectionDto<K extends SectionKeyType = SectionKeyType> = Omit<
  ReportSectionDtoFromSchema,
  "key" | "data"
> & {
  key: K
  data: SectionDataByKey[K] | null
}

export const EvaluationDto = z.object({
  id: z.string(),
  status: EvaluationStatus,
  phase: EvaluationPhase,
  input: z.string(),
  normalizedUrl: z.string().nullable(),
  companyName: z.string().nullable(),
  domain: z.string().nullable(),
  createdAt: isoDateString,
  updatedAt: isoDateString,
  completedAt: isoDateString.nullable(),
  error: ApiError.nullable(),
  progress: ProgressDto,
  summary: SummaryDto,
  sections: z.array(ReportSectionDto),
  findings: z.array(Finding),
  evidence: z.array(EvidenceItem),
  poll: PollDto,
})
type EvaluationDtoFromSchema = z.infer<typeof EvaluationDto>
export type EvaluationDto = Omit<EvaluationDtoFromSchema, "sections"> & {
  sections: ReportSectionDto[]
}

export const CreateEvaluationResponse = z.object({
  id: z.string(),
  status: EvaluationStatus,
  phase: EvaluationPhase,
  input: z.string(),
  normalizedUrl: z.string().nullable(),
  companyName: z.string().nullable(),
  domain: z.string().nullable(),
  createdAt: isoDateString,
  reportUrl: z.string(),
  pollAfterMs: z.number().int().min(0),
})
export type CreateEvaluationResponse = z.infer<typeof CreateEvaluationResponse>

export const EvaluationContext = z.object({
  useCase: z.string().max(500).optional(),
  companySize: CompanySize.optional(),
  priorities: z.array(z.string()).max(8).optional(),
})
export type EvaluationContext = z.infer<typeof EvaluationContext>

export const CreateEvaluationRequest = z.object({
  input: z
    .string()
    .trim()
    .min(2, "input must be at least 2 characters")
    .max(200, "input must be at most 200 characters"),
  context: EvaluationContext.optional(),
})
export type CreateEvaluationRequest = z.infer<typeof CreateEvaluationRequest>
