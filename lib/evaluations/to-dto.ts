import {
  SECTION_KEYS,
  SECTION_TITLES,
  type ApiError,
  type CreateEvaluationResponse,
  type EvaluationDto,
  type EvidenceIncludeMode,
  type ReportSectionDto,
  type SectionKey,
} from "@/lib/api-types";
import { computeProgress, STUB_TIMELINE } from "@/lib/evaluations/progress";
import type { EvaluationRecord } from "@/lib/evaluations/store";

const PIPELINE_FAILED_ERROR: ApiError = {
  code: "PIPELINE_FAILED",
  message: "Could not collect official sources for this domain.",
  phase: "collecting_official",
};

export function toEvaluationDto(
  record: EvaluationRecord,
  opts: { includeEvidence: EvidenceIncludeMode; now?: number },
): { dto: EvaluationDto; etag: string } {
  const now = opts.now ?? Date.now();
  const progress = computeProgress(record.createdAt, now, record.resolved.willFail);
  const etag = `W/"${progress.status}-${progress.percent}-${progress.sectionsCompleted}"`;

  const resolvedVisible = progress.phase !== "queued" && progress.phase !== "resolving_entity";
  const nowIso = new Date(now).toISOString();

  let completedAt: string | null = null;
  if (progress.status === "completed") {
    completedAt = new Date(record.createdAt + STUB_TIMELINE.recommendEnd).toISOString();
  } else if (progress.status === "failed") {
    completedAt = new Date(record.createdAt + STUB_TIMELINE.failAt).toISOString();
  }

  const sections: ReportSectionDto[] = SECTION_KEYS.map((key: SectionKey) => {
    const status = progress.sectionStatuses[key];
    const isCompleted = status === "completed";
    return {
      key,
      title: SECTION_TITLES[key],
      status,
      confidence: isCompleted ? record.content.sectionConfidence[key] : null,
      updatedAt: status === "pending" ? null : nowIso,
      error: null,
      data: isCompleted ? record.content.sections[key] : null,
    };
  });

  const findings = record.content.findings.filter(
    (finding) => progress.sectionStatuses[finding.sectionKey] === "completed",
  );

  const evidence = opts.includeEvidence === "none" ? [] : record.content.evidence;

  const execDone = progress.sectionStatuses.executive_summary === "completed";
  const summary = execDone
    ? {
        overallScore: record.content.sections.executive_summary.overallScore,
        verdict: record.content.sections.recommendation.adopt,
        confidence: record.content.sections.executive_summary.confidence,
        headline: record.content.sections.executive_summary.headline,
        bestSuitedFor: record.content.sections.executive_summary.bestSuitedFor,
        avoidIf: record.content.sections.executive_summary.avoidIf,
      }
    : {
        overallScore: null,
        verdict: null,
        confidence: null,
        headline: null,
        bestSuitedFor: [],
        avoidIf: [],
      };

  const shouldPoll = progress.status === "queued" || progress.status === "running";

  const dto: EvaluationDto = {
    id: record.id,
    status: progress.status,
    phase: progress.phase,
    input: record.input,
    normalizedUrl: resolvedVisible ? record.resolved.normalizedUrl : null,
    companyName: resolvedVisible ? record.resolved.companyName : null,
    domain: resolvedVisible ? record.resolved.domain : null,
    createdAt: new Date(record.createdAt).toISOString(),
    updatedAt: completedAt ?? nowIso,
    completedAt,
    error: progress.status === "failed" ? PIPELINE_FAILED_ERROR : null,
    progress: {
      percent: progress.percent,
      phase: progress.phase,
      phases: progress.phases,
      sectionsCompleted: progress.sectionsCompleted,
      sectionsTotal: progress.sectionsTotal,
    },
    summary,
    sections,
    findings,
    evidence,
    poll: {
      shouldPoll,
      pollAfterMs: shouldPoll ? 2000 : 0,
      etag,
    },
  };

  return { dto, etag };
}

export function toCreateEvaluationResponse(record: EvaluationRecord): CreateEvaluationResponse {
  const { dto } = toEvaluationDto(record, { includeEvidence: "none", now: record.createdAt });
  return {
    id: dto.id,
    status: dto.status,
    phase: dto.phase,
    input: dto.input,
    normalizedUrl: dto.normalizedUrl,
    companyName: dto.companyName,
    domain: dto.domain,
    createdAt: dto.createdAt,
    reportUrl: `/report/${record.id}`,
    pollAfterMs: dto.poll.pollAfterMs || 2000,
  };
}
