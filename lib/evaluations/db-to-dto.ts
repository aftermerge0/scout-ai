import {
  SECTION_KEYS,
  type ApiError,
  type EvaluationDto,
  type EvaluationPhase,
  type EvidenceIncludeMode,
  type EvidenceItem,
  type Finding,
  type PhaseStatus,
  type ReportSectionDto,
  type RiskLevel,
  type SectionKey,
  type SectionStatus,
  type SummaryDto,
} from "@/lib/api-types";
import type { EvaluationRow } from "@/lib/evaluations/repository";

/**
 * Maps a live (Prisma) evaluation row + relations onto the exact
 * `EvaluationDto` contract shape — the live-mode counterpart of
 * `lib/evaluations/to-dto.ts` (which serves the stub simulation).
 */

const ANALYSIS_PHASES: Exclude<EvaluationPhase, "queued" | "done" | "failed">[] = [
  "resolving_entity",
  "collecting_official",
  "collecting_external",
  "analyzing",
  "recommending",
];

function derivePhases(
  currentPhase: EvaluationPhase,
  status: string,
  failedAtPhase: EvaluationPhase | null,
): Array<{ key: (typeof ANALYSIS_PHASES)[number]; status: PhaseStatus }> {
  if (currentPhase === "queued") {
    return ANALYSIS_PHASES.map((key) => ({ key, status: "pending" as PhaseStatus }));
  }
  if (currentPhase === "done") {
    return ANALYSIS_PHASES.map((key) => ({ key, status: "completed" as PhaseStatus }));
  }

  const effectivePhase = status === "failed" ? (failedAtPhase ?? "collecting_official") : currentPhase;
  const currentIndex = ANALYSIS_PHASES.indexOf(effectivePhase as never);
  const resolvedIndex = currentIndex >= 0 ? currentIndex : ANALYSIS_PHASES.length;

  return ANALYSIS_PHASES.map((key, index) => {
    if (status === "failed" && index === resolvedIndex) return { key, status: "failed" as PhaseStatus };
    if (index < resolvedIndex) return { key, status: "completed" as PhaseStatus };
    if (index === resolvedIndex) return { key, status: "running" as PhaseStatus };
    return { key, status: "pending" as PhaseStatus };
  });
}

function percentFor(phase: EvaluationPhase, status: string, sectionsCompleted: number, sectionsTotal: number): number {
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
  const floor = base[phase] ?? 0;
  if (phase !== "analyzing" || sectionsTotal === 0) return floor;
  const analysisSpan = base.recommending - base.analyzing;
  return Math.round(floor + (sectionsCompleted / sectionsTotal) * analysisSpan);
}

export function toEvaluationDtoFromDb(
  row: NonNullable<EvaluationRow>,
  opts: { includeEvidence: EvidenceIncludeMode },
): { dto: EvaluationDto; etag: string } {
  const phase = row.phase as EvaluationPhase;
  const status = row.status as EvaluationDto["status"];

  const sectionByKey = new Map(row.sections.map((s) => [s.key as SectionKey, s]));
  const sections: ReportSectionDto[] = SECTION_KEYS.map((key) => {
    const row2 = sectionByKey.get(key);
    return {
      key,
      title: row2?.title ?? key,
      status: (row2?.status as SectionStatus) ?? "pending",
      confidence: row2?.confidence ?? null,
      updatedAt: row2 && row2.status !== "pending" ? row2.updatedAt.toISOString() : null,
      error: (row2?.errorJson as ApiError | null) ?? null,
      data: row2?.status === "completed" ? ((row2.dataJson as ReportSectionDto["data"]) ?? null) : null,
    };
  });

  const sectionsCompleted = sections.filter((s) => s.status === "completed").length;
  const sectionsTotal = sections.length;
  const percent = percentFor(phase, status, sectionsCompleted, sectionsTotal);
  const topLevelError = (row.errorJson as ApiError | null) ?? null;
  const phases = derivePhases(phase, status, topLevelError?.phase ?? null);

  const etag = `W/"${row.updatedAt.getTime()}-${status}-${sectionsCompleted}"`;

  const findings: Finding[] = row.findings.map((f) => ({
    id: f.id,
    category: f.category,
    severity: f.severity as RiskLevel,
    title: f.title,
    summary: f.summary,
    confidence: f.confidence,
    evidenceIds: f.evidenceIds,
    sectionKey: f.sectionKey as SectionKey,
  }));

  const allEvidence: EvidenceItem[] = row.evidence.map((e) => ({
    id: e.id,
    sourceType: e.sourceType as EvidenceItem["sourceType"],
    url: e.url,
    title: e.title,
    domain: e.domain,
    snippet: e.snippet,
    fetchedAt: e.fetchedAt.toISOString(),
  }));
  const evidence =
    opts.includeEvidence === "none" ? [] : opts.includeEvidence === "summary" ? allEvidence.slice(0, 40) : allEvidence;

  const summary: SummaryDto = row.summaryJson
    ? (row.summaryJson as unknown as SummaryDto)
    : { overallScore: null, verdict: null, confidence: null, headline: null, bestSuitedFor: [], avoidIf: [] };

  const shouldPoll = status === "queued" || status === "running";

  const dto: EvaluationDto = {
    id: row.id,
    status,
    phase,
    input: row.input,
    normalizedUrl: row.normalizedUrl,
    companyName: row.companyName,
    domain: row.domain,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    completedAt: row.completedAt ? row.completedAt.toISOString() : null,
    error: topLevelError,
    progress: { percent, phase, phases, sectionsCompleted, sectionsTotal },
    summary,
    sections,
    findings,
    evidence,
    poll: { shouldPoll, pollAfterMs: shouldPoll ? 2000 : 0, etag },
  };

  return { dto, etag };
}
