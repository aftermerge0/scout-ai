import {
  PHASE_ORDER,
  SECTION_KEYS,
  type ApiError,
  type EvaluationContext,
  type EvaluationDto,
  type EvaluationPhase,
  type PhaseStatus,
  type RecommendationVerdict,
  type RiskLevel,
  type SectionData,
  type SectionKey,
  type SectionStatus,
  type SummaryDto,
} from "@/lib/api-types";
import * as repo from "@/lib/evaluations/repository";
import type { EvaluationRow } from "@/lib/evaluations/repository";
import type { EvaluationSnapshot, EvaluationSnapshotProgress, EvaluationStore } from "@/lib/evaluations/store/types";

const EMPTY_SUMMARY: SummaryDto = {
  overallScore: null,
  verdict: null,
  confidence: null,
  headline: null,
  bestSuitedFor: [],
  avoidIf: [],
};

function derivePhases(
  currentPhase: EvaluationPhase,
  status: EvaluationDto["status"],
  failedAtPhase: EvaluationPhase | null,
): EvaluationSnapshotProgress["phases"] {
  if (currentPhase === "queued") {
    return PHASE_ORDER.map((key) => ({ key, status: "pending" as PhaseStatus }));
  }
  if (currentPhase === "done") {
    return PHASE_ORDER.map((key) => ({ key, status: "completed" as PhaseStatus }));
  }

  const effectivePhase = status === "failed" ? (failedAtPhase ?? "collecting_official") : currentPhase;
  const currentIndex = PHASE_ORDER.indexOf(effectivePhase as (typeof PHASE_ORDER)[number]);
  const resolvedIndex = currentIndex >= 0 ? currentIndex : PHASE_ORDER.length;

  return PHASE_ORDER.map((key, index) => {
    if (status === "failed" && index === resolvedIndex) return { key, status: "failed" as PhaseStatus };
    if (index < resolvedIndex) return { key, status: "completed" as PhaseStatus };
    if (index === resolvedIndex) return { key, status: "running" as PhaseStatus };
    return { key, status: "pending" as PhaseStatus };
  });
}

function percentFor(
  phase: EvaluationPhase,
  status: EvaluationDto["status"],
  sectionsCompleted: number,
  sectionsTotal: number,
): number {
  if (status === "completed") return 100;
  if (status === "failed") return 20;

  const base: Record<EvaluationPhase, number> = {
    queued: 0,
    resolving_entity: 8,
    collecting_official: 20,
    collecting_external: 35,
    analyzing: 45,
    recommending: 90,
    done: 100,
    failed: 20,
  };
  const floor = base[phase];
  if (phase !== "analyzing" || sectionsTotal === 0) return floor;
  const analysisSpan = base.recommending - base.analyzing;
  return Math.round(floor + (sectionsCompleted / sectionsTotal) * analysisSpan);
}

function toSnapshot(row: NonNullable<EvaluationRow>): EvaluationSnapshot {
  const phase = row.phase as EvaluationPhase;
  const status = row.status as EvaluationDto["status"];
  const topLevelError = (row.errorJson as ApiError | null) ?? null;

  const sectionByKey = new Map(row.sections.map((section) => [section.key as SectionKey, section]));
  const sections = SECTION_KEYS.map((key) => {
    const section = sectionByKey.get(key);
    const sectionStatus = (section?.status as SectionStatus | undefined) ?? "pending";
    return {
      key,
      title: section?.title ?? key,
      status: sectionStatus,
      confidence: section?.confidence ?? null,
      updatedAt: section && sectionStatus !== "pending" ? section.updatedAt : null,
      error: (section?.errorJson as ApiError | null) ?? null,
      data: sectionStatus === "completed" ? ((section?.dataJson as SectionData | null) ?? null) : null,
    };
  });

  const sectionsCompleted = sections.filter((section) => section.status === "completed").length;
  const sectionsTotal = sections.length;
  const summary = row.summaryJson ? (row.summaryJson as unknown as SummaryDto) : EMPTY_SUMMARY;

  return {
    id: row.id,
    input: row.input,
    context: (row.contextJson as EvaluationContext | null) ?? null,
    status,
    phase,
    normalizedUrl: row.normalizedUrl,
    companyName: row.companyName,
    domain: row.domain,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    completedAt: row.completedAt,
    error: topLevelError,
    progress: {
      percent: percentFor(phase, status, sectionsCompleted, sectionsTotal),
      phase,
      phases: derivePhases(phase, status, topLevelError?.phase ?? null),
      sectionsCompleted,
      sectionsTotal,
    },
    summary,
    sections,
    findings: row.findings.map((finding) => ({
      id: finding.id,
      category: finding.category,
      severity: finding.severity as RiskLevel,
      title: finding.title,
      summary: finding.summary,
      confidence: finding.confidence,
      evidenceIds: finding.evidenceIds,
      sectionKey: finding.sectionKey as SectionKey,
    })),
    evidence: row.evidence.map((item) => ({
      id: item.id,
      sourceType: item.sourceType as "official" | "external",
      url: item.url,
      title: item.title,
      domain: item.domain,
      snippet: item.snippet,
      markdown: item.markdown,
      fetchedAt: item.fetchedAt,
    })),
    verdict: row.verdict as RecommendationVerdict | null,
    overallScore: row.overallScore,
    confidence: row.confidence,
  };
}

async function getSnapshot(id: string): Promise<EvaluationSnapshot | null> {
  const row = await repo.getEvaluationWithRelations(id);
  return row ? toSnapshot(row) : null;
}

export function createDrizzleEvaluationStore(): EvaluationStore {
  return {
    async create(input, context) {
      const evaluation = await repo.createEvaluation(input, context);
      const snapshot = await getSnapshot(evaluation.id);
      if (!snapshot) {
        throw new Error(`Created evaluation "${evaluation.id}" could not be read back.`);
      }
      return { ...snapshot, shouldRunPipeline: true };
    },
    get: getSnapshot,
    async findRecentByDomain(domain, sinceMs) {
      const evaluation = await repo.findRecentByDomain(domain, sinceMs);
      return evaluation ? getSnapshot(evaluation.id) : null;
    },
  };
}
