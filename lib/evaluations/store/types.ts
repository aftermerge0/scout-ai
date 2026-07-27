import type {
  ApiError,
  EvaluationContext,
  EvaluationPhase,
  EvaluationStatus,
  EvidenceSourceType,
  Finding,
  PhaseStatus,
  RecommendationVerdict,
  SectionData,
  SectionKey,
  SectionStatus,
  SummaryDto,
} from "@/lib/api-types";

export type EvaluationSnapshotEvidence = {
  id: string;
  sourceType: EvidenceSourceType;
  url: string;
  title: string | null;
  domain: string | null;
  snippet: string | null;
  markdown: string | null;
  fetchedAt: Date;
};

export type EvaluationSnapshotSection = {
  key: SectionKey;
  title: string;
  status: SectionStatus;
  confidence: number | null;
  updatedAt: Date | null;
  error: ApiError | null;
  data: SectionData | null;
};

export type EvaluationSnapshotProgress = {
  percent: number;
  phase: EvaluationPhase;
  phases: Array<{ key: EvaluationPhase; status: PhaseStatus }>;
  sectionsCompleted: number;
  sectionsTotal: number;
};

export type EvaluationSnapshot = {
  id: string;
  input: string;
  context: EvaluationContext | null;
  status: EvaluationStatus;
  phase: EvaluationPhase;
  normalizedUrl: string | null;
  companyName: string | null;
  domain: string | null;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
  error: ApiError | null;
  progress: EvaluationSnapshotProgress;
  summary: SummaryDto;
  sections: EvaluationSnapshotSection[];
  findings: Finding[];
  evidence: EvaluationSnapshotEvidence[];
  verdict: RecommendationVerdict | null;
  overallScore: number | null;
  confidence: number | null;
};

export type EvaluationCreateResult = EvaluationSnapshot & {
  shouldRunPipeline: boolean;
};

export type EvaluationStore = {
  create(input: string, context: EvaluationContext | null): Promise<EvaluationCreateResult>;
  get(id: string): Promise<EvaluationSnapshot | null>;
  findRecentByDomain(domain: string, sinceMs: number): Promise<EvaluationSnapshot | null>;
};

export type EvaluationStoreMode = "memory" | "drizzle";
