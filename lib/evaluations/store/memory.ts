import {
  SECTION_KEYS,
  SECTION_TITLES,
  type ApiError,
  type EvaluationContext,
  type SummaryDto,
} from "@/lib/api-types";
import { generateEvaluationContent, type GeneratedContent } from "@/lib/evaluations/generate-content";
import { resolveEntity, type ResolvedEntity } from "@/lib/evaluations/domain";
import { computeProgress, STUB_TIMELINE } from "@/lib/evaluations/progress";
import type { EvaluationSnapshot, EvaluationStore } from "@/lib/evaluations/store/types";

type EvaluationRecord = {
  id: string;
  input: string;
  context: EvaluationContext | null;
  createdAt: number;
  resolved: ResolvedEntity;
  content: GeneratedContent;
};

type StoreGlobal = typeof globalThis & {
  __scoutEvaluationStore?: Map<string, EvaluationRecord>;
};

const PIPELINE_FAILED_ERROR: ApiError = {
  code: "PIPELINE_FAILED",
  message: "Could not collect official sources for this domain.",
  phase: "collecting_official",
};

const EMPTY_SUMMARY: SummaryDto = {
  overallScore: null,
  verdict: null,
  confidence: null,
  headline: null,
  bestSuitedFor: [],
  avoidIf: [],
};

function getStore(): Map<string, EvaluationRecord> {
  const g = globalThis as StoreGlobal;
  if (!g.__scoutEvaluationStore) {
    g.__scoutEvaluationStore = new Map();
  }
  return g.__scoutEvaluationStore;
}

function createEvaluationRecord(input: string, context: EvaluationContext | null): EvaluationRecord {
  const id = crypto.randomUUID();
  const createdAt = Date.now();
  const resolved = resolveEntity(input);
  const content = generateEvaluationContent({
    companyName: resolved.companyName,
    domain: resolved.domain,
    normalizedUrl: resolved.normalizedUrl,
    createdAt,
  });

  const record: EvaluationRecord = { id, input, context, createdAt, resolved, content };
  getStore().set(id, record);
  return record;
}

function toSnapshot(record: EvaluationRecord, now = Date.now()): EvaluationSnapshot {
  const progress = computeProgress(record.createdAt, now, record.resolved.willFail);
  const resolvedVisible = progress.phase !== "queued" && progress.phase !== "resolving_entity";
  const completedAt =
    progress.status === "completed"
      ? new Date(record.createdAt + STUB_TIMELINE.recommendEnd)
      : progress.status === "failed"
        ? new Date(record.createdAt + STUB_TIMELINE.failAt)
        : null;
  const updatedAt = completedAt ?? new Date(now);

  const sections = SECTION_KEYS.map((key) => {
    const status = progress.sectionStatuses[key];
    const isCompleted = status === "completed";
    return {
      key,
      title: SECTION_TITLES[key],
      status,
      confidence: isCompleted ? record.content.sectionConfidence[key] : null,
      updatedAt: status === "pending" ? null : updatedAt,
      error: null,
      data: isCompleted ? record.content.sections[key] : null,
    };
  });

  const findings = record.content.findings.filter(
    (finding) => progress.sectionStatuses[finding.sectionKey] === "completed",
  );

  const executiveSummaryDone = progress.sectionStatuses.executive_summary === "completed";
  const summary: SummaryDto = executiveSummaryDone
    ? {
        overallScore: record.content.sections.executive_summary.overallScore,
        verdict: record.content.sections.recommendation.adopt,
        confidence: record.content.sections.executive_summary.confidence,
        headline: record.content.sections.executive_summary.headline,
        bestSuitedFor: record.content.sections.executive_summary.bestSuitedFor,
        avoidIf: record.content.sections.executive_summary.avoidIf,
      }
    : EMPTY_SUMMARY;

  return {
    id: record.id,
    input: record.input,
    context: record.context,
    status: progress.status,
    phase: progress.phase,
    normalizedUrl: resolvedVisible ? record.resolved.normalizedUrl : null,
    companyName: resolvedVisible ? record.resolved.companyName : null,
    domain: resolvedVisible ? record.resolved.domain : null,
    createdAt: new Date(record.createdAt),
    updatedAt,
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
    evidence: record.content.evidence.map((item) => ({
      ...item,
      markdown: null,
      fetchedAt: new Date(item.fetchedAt),
    })),
    verdict: summary.verdict,
    overallScore: summary.overallScore,
    confidence: summary.confidence,
  };
}

export function createMemoryEvaluationStore(): EvaluationStore {
  return {
    async create(input, context) {
      return { ...toSnapshot(createEvaluationRecord(input, context)), shouldRunPipeline: false };
    },
    async get(id) {
      const record = getStore().get(id);
      return record ? toSnapshot(record) : null;
    },
    async findRecentByDomain(domain, sinceMs) {
      const records = Array.from(getStore().values())
        .filter((record) => record.resolved.domain === domain && record.createdAt >= sinceMs)
        .sort((a, b) => b.createdAt - a.createdAt);

      for (const record of records) {
        const snapshot = toSnapshot(record);
        if (snapshot.status === "completed" || snapshot.status === "partial") {
          return snapshot;
        }
      }
      return null;
    },
  };
}
