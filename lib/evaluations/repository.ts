import { getDb } from "@/lib/db";
import { SECTION_KEYS, SECTION_TITLES } from "@/lib/api-types";
import type {
  ApiError,
  EvaluationContext,
  EvaluationPhase,
  EvaluationStatus,
  EvidenceSourceType,
  Finding,
  RecommendationVerdict,
  SectionData,
  SectionKey,
  SectionStatus,
  SummaryDto,
} from "@/lib/api-types";

/**
 * Prisma-backed persistence for the real (`SCOUT_API_MODE=live`) pipeline.
 * Mirrors the shape of `lib/evaluations/store.ts` (the stub's in-memory
 * store) but is durable and shared across serverless instances.
 */

export type EvaluationRow = Awaited<ReturnType<typeof getEvaluationWithRelations>>;

export async function createEvaluation(input: string, context: EvaluationContext | null) {
  const db = getDb();
  const evaluation = await db.evaluation.create({
    data: {
      input,
      status: "queued",
      phase: "queued",
      contextJson: context ?? undefined,
      sections: {
        create: SECTION_KEYS.map((key) => ({
          key,
          title: SECTION_TITLES[key],
          status: "pending" as SectionStatus,
        })),
      },
    },
  });
  return evaluation;
}

export async function getEvaluationWithRelations(id: string) {
  const db = getDb();
  return db.evaluation.findUnique({
    where: { id },
    include: {
      sections: true,
      evidence: true,
      findings: true,
    },
  });
}

export async function setEntity(
  id: string,
  entity: { normalizedUrl: string | null; domain: string | null; companyName: string | null },
) {
  const db = getDb();
  await db.evaluation.update({
    where: { id },
    data: {
      normalizedUrl: entity.normalizedUrl,
      domain: entity.domain,
      companyName: entity.companyName,
    },
  });
}

export async function setPhase(id: string, phase: EvaluationPhase, status?: EvaluationStatus) {
  const db = getDb();
  await db.evaluation.update({
    where: { id },
    data: { phase, ...(status ? { status } : {}) },
  });
}

export async function addEvidence(
  evaluationId: string,
  items: Array<{
    sourceType: EvidenceSourceType;
    url: string;
    title: string | null;
    domain: string | null;
    snippet: string | null;
    markdown: string | null;
    fetchedAt: Date;
  }>,
) {
  if (items.length === 0) return;
  const db = getDb();
  await db.evidence.createMany({
    data: items.map((item) => ({ ...item, evaluationId })),
  });
}

export async function setSectionRunning(evaluationId: string, key: SectionKey) {
  const db = getDb();
  await db.reportSection.update({
    where: { evaluationId_key: { evaluationId, key } },
    data: { status: "running" },
  });
}

export async function completeSection(
  evaluationId: string,
  key: SectionKey,
  data: SectionData,
  confidence: number,
) {
  const db = getDb();
  await db.reportSection.update({
    where: { evaluationId_key: { evaluationId, key } },
    data: { status: "completed", dataJson: data as object, confidence, errorJson: undefined },
  });
}

export async function failSection(evaluationId: string, key: SectionKey, error: ApiError) {
  const db = getDb();
  await db.reportSection.update({
    where: { evaluationId_key: { evaluationId, key } },
    data: { status: "failed", errorJson: error as unknown as object },
  });
}

export async function addFindings(evaluationId: string, findings: Finding[]) {
  if (findings.length === 0) return;
  const db = getDb();
  await db.finding.createMany({
    data: findings.map((f) => ({
      id: f.id,
      evaluationId,
      category: f.category,
      severity: f.severity,
      title: f.title,
      summary: f.summary,
      confidence: f.confidence,
      evidenceIds: f.evidenceIds,
      sectionKey: f.sectionKey,
    })),
  });
}

export async function markCompleted(
  id: string,
  summary: SummaryDto & { verdict: RecommendationVerdict },
) {
  const db = getDb();
  await db.evaluation.update({
    where: { id },
    data: {
      status: "completed",
      phase: "done",
      completedAt: new Date(),
      overallScore: summary.overallScore,
      verdict: summary.verdict,
      confidence: summary.confidence,
      summaryJson: summary as unknown as object,
    },
  });
}

export async function markPartial(
  id: string,
  summary: (SummaryDto & { verdict: RecommendationVerdict }) | null,
) {
  const db = getDb();
  await db.evaluation.update({
    where: { id },
    data: {
      status: "partial",
      phase: "done",
      completedAt: new Date(),
      ...(summary
        ? {
            overallScore: summary.overallScore,
            verdict: summary.verdict,
            confidence: summary.confidence,
            summaryJson: summary as unknown as object,
          }
        : {}),
    },
  });
}

export async function markFailed(id: string, error: ApiError) {
  const db = getDb();
  await db.evaluation.update({
    where: { id },
    data: {
      status: "failed",
      phase: "failed",
      completedAt: new Date(),
      errorJson: error as unknown as object,
    },
  });
}

/** Most recent completed/partial evaluation for a domain within the dedupe window (Phase 4 cache). */
export async function findRecentByDomain(domain: string, sinceMs: number) {
  const db = getDb();
  return db.evaluation.findFirst({
    where: {
      domain,
      status: { in: ["completed", "partial"] },
      createdAt: { gte: new Date(sinceMs) },
    },
    orderBy: { createdAt: "desc" },
  });
}
