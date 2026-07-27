import type {
  CreateEvaluationResponse,
  EvaluationDto,
  EvidenceIncludeMode,
  EvidenceItem,
  ReportSectionDto,
} from "@/lib/api-types";
import type { EvaluationSnapshot, EvaluationSnapshotEvidence } from "@/lib/evaluations/store";

export function toEvaluationDto(
  snapshot: EvaluationSnapshot,
  opts: { includeEvidence: EvidenceIncludeMode },
): { dto: EvaluationDto; etag: string } {
  const sections: ReportSectionDto[] = snapshot.sections.map((section) => ({
    key: section.key,
    title: section.title,
    status: section.status,
    confidence: section.confidence,
    updatedAt: section.updatedAt ? section.updatedAt.toISOString() : null,
    error: section.error,
    data: section.data as ReportSectionDto["data"],
  }));

  const allEvidence = toEvidenceItems(snapshot.evidence);
  const evidence =
    opts.includeEvidence === "none"
      ? []
      : opts.includeEvidence === "summary"
        ? allEvidence.slice(0, 40)
        : allEvidence;

  const shouldPoll = snapshot.status === "queued" || snapshot.status === "running";
  const etag = `W/"${snapshot.updatedAt.getTime()}-${snapshot.status}-${snapshot.progress.sectionsCompleted}"`;

  const dto: EvaluationDto = {
    id: snapshot.id,
    status: snapshot.status,
    phase: snapshot.phase,
    input: snapshot.input,
    normalizedUrl: snapshot.normalizedUrl,
    companyName: snapshot.companyName,
    domain: snapshot.domain,
    createdAt: snapshot.createdAt.toISOString(),
    updatedAt: snapshot.updatedAt.toISOString(),
    completedAt: snapshot.completedAt ? snapshot.completedAt.toISOString() : null,
    error: snapshot.error,
    progress: {
      percent: snapshot.progress.percent,
      phase: snapshot.progress.phase,
      phases: snapshot.progress.phases,
      sectionsCompleted: snapshot.progress.sectionsCompleted,
      sectionsTotal: snapshot.progress.sectionsTotal,
    },
    summary: snapshot.summary,
    sections,
    findings: snapshot.findings,
    evidence,
    poll: {
      shouldPoll,
      pollAfterMs: shouldPoll ? 2000 : 0,
      etag,
    },
  };

  return { dto, etag };
}

export function toEvidenceItems(evidence: EvaluationSnapshotEvidence[]): EvidenceItem[] {
  return evidence.map((item) => ({
    id: item.id,
    sourceType: item.sourceType,
    url: item.url,
    title: item.title,
    domain: item.domain,
    snippet: item.snippet,
    fetchedAt: item.fetchedAt.toISOString(),
  }));
}

export function toCreateEvaluationResponse(snapshot: EvaluationSnapshot): CreateEvaluationResponse {
  const { dto } = toEvaluationDto(snapshot, { includeEvidence: "none" });
  return {
    id: dto.id,
    status: dto.status,
    phase: dto.phase,
    input: dto.input,
    normalizedUrl: dto.normalizedUrl,
    companyName: dto.companyName,
    domain: dto.domain,
    createdAt: dto.createdAt,
    reportUrl: `/report/${snapshot.id}`,
    pollAfterMs: dto.poll.pollAfterMs,
  };
}
