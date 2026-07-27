import { and, asc, desc, eq, gte, inArray } from "drizzle-orm"

import {
  evidence,
  evaluations,
  findings as findingsTable,
  getDb,
  reportSections,
} from "@/lib/db"
import { SECTION_KEYS, SECTION_TITLES } from "@/lib/api-types"
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
} from "@/lib/api-types"
import type { Evaluation, Evidence, FindingRow, ReportSection } from "@/lib/db"

/**
 * Drizzle-backed persistence for the live (`SCOUT_API_MODE=live`) pipeline.
 * Route read/create go through `lib/evaluations/store` (EvaluationStore seam);
 * pipeline writes still call this module directly until Candidate 03.
 */

export type EvaluationRow =
  | (Evaluation & {
      sections: ReportSection[]
      evidence: Evidence[]
      findings: FindingRow[]
    })
  | null

export async function createEvaluation(
  input: string,
  context: EvaluationContext | null
) {
  const db = getDb()
  return db.transaction(async (tx) => {
    const [evaluation] = await tx
      .insert(evaluations)
      .values({
        input,
        status: "queued",
        phase: "queued",
        contextJson: context,
      })
      .returning()

    await tx.insert(reportSections).values(
      SECTION_KEYS.map((key) => ({
        evaluationId: evaluation.id,
        key,
        title: SECTION_TITLES[key],
        status: "pending" as SectionStatus,
      }))
    )

    return evaluation
  })
}

export async function getEvaluationWithRelations(id: string) {
  const db = getDb()
  const [evaluation] = await db
    .select()
    .from(evaluations)
    .where(eq(evaluations.id, id))
    .limit(1)
  if (!evaluation) return null

  const [sections, evidenceRows, findingRows] = await Promise.all([
    db
      .select()
      .from(reportSections)
      .where(eq(reportSections.evaluationId, id))
      .orderBy(asc(reportSections.key)),
    db
      .select()
      .from(evidence)
      .where(eq(evidence.evaluationId, id))
      .orderBy(asc(evidence.fetchedAt)),
    db
      .select()
      .from(findingsTable)
      .where(eq(findingsTable.evaluationId, id))
      .orderBy(asc(findingsTable.id)),
  ])

  return {
    ...evaluation,
    sections,
    evidence: evidenceRows,
    findings: findingRows,
  }
}

export async function setEntity(
  id: string,
  entity: {
    normalizedUrl: string | null
    domain: string | null
    companyName: string | null
  }
) {
  const db = getDb()
  await db
    .update(evaluations)
    .set({
      normalizedUrl: entity.normalizedUrl,
      domain: entity.domain,
      companyName: entity.companyName,
      updatedAt: new Date(),
    })
    .where(eq(evaluations.id, id))
}

export async function setPhase(
  id: string,
  phase: EvaluationPhase,
  status?: EvaluationStatus
) {
  const db = getDb()
  await db
    .update(evaluations)
    .set({ phase, ...(status ? { status } : {}), updatedAt: new Date() })
    .where(eq(evaluations.id, id))
}

export async function addEvidence(
  evaluationId: string,
  items: Array<{
    sourceType: EvidenceSourceType
    url: string
    title: string | null
    domain: string | null
    snippet: string | null
    markdown: string | null
    fetchedAt: Date
  }>
) {
  if (items.length === 0) return
  const db = getDb()
  await db
    .insert(evidence)
    .values(items.map((item) => ({ ...item, evaluationId })))
}

export async function setSectionRunning(evaluationId: string, key: SectionKey) {
  const db = getDb()
  await db
    .update(reportSections)
    .set({ status: "running", updatedAt: new Date() })
    .where(
      and(
        eq(reportSections.evaluationId, evaluationId),
        eq(reportSections.key, key)
      )
    )
}

export async function completeSection(
  evaluationId: string,
  key: SectionKey,
  data: SectionData,
  confidence: number
) {
  const db = getDb()
  await db
    .update(reportSections)
    .set({
      status: "completed",
      dataJson: data,
      confidence,
      errorJson: null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(reportSections.evaluationId, evaluationId),
        eq(reportSections.key, key)
      )
    )
}

export async function failSection(
  evaluationId: string,
  key: SectionKey,
  error: ApiError
) {
  const db = getDb()
  await db
    .update(reportSections)
    .set({ status: "failed", errorJson: error, updatedAt: new Date() })
    .where(
      and(
        eq(reportSections.evaluationId, evaluationId),
        eq(reportSections.key, key)
      )
    )
}

export async function addFindings(evaluationId: string, findings: Finding[]) {
  if (findings.length === 0) return
  const db = getDb()
  await db.insert(findingsTable).values(
    findings.map((f) => ({
      id: f.id,
      evaluationId,
      category: f.category,
      severity: f.severity,
      title: f.title,
      summary: f.summary,
      confidence: f.confidence,
      evidenceIds: f.evidenceIds,
      sectionKey: f.sectionKey,
    }))
  )
}

export async function markCompleted(
  id: string,
  summary: SummaryDto & { verdict: RecommendationVerdict }
) {
  const db = getDb()
  await db
    .update(evaluations)
    .set({
      status: "completed",
      phase: "done",
      completedAt: new Date(),
      overallScore: summary.overallScore,
      verdict: summary.verdict,
      confidence: summary.confidence,
      summaryJson: summary,
      updatedAt: new Date(),
    })
    .where(eq(evaluations.id, id))
}

export async function markPartial(
  id: string,
  summary: (SummaryDto & { verdict: RecommendationVerdict }) | null
) {
  const db = getDb()
  await db
    .update(evaluations)
    .set({
      status: "partial",
      phase: "done",
      completedAt: new Date(),
      ...(summary
        ? {
            overallScore: summary.overallScore,
            verdict: summary.verdict,
            confidence: summary.confidence,
            summaryJson: summary,
          }
        : {}),
      updatedAt: new Date(),
    })
    .where(eq(evaluations.id, id))
}

export async function markFailed(id: string, error: ApiError) {
  const db = getDb()
  await db
    .update(evaluations)
    .set({
      status: "failed",
      phase: "failed",
      completedAt: new Date(),
      errorJson: error,
      updatedAt: new Date(),
    })
    .where(eq(evaluations.id, id))
}

/** Most recent completed/partial evaluation for a domain within the dedupe window (Phase 4 cache). */
export async function findRecentByDomain(domain: string, sinceMs: number) {
  const db = getDb()
  const [evaluation] = await db
    .select()
    .from(evaluations)
    .where(
      and(
        eq(evaluations.domain, domain),
        inArray(evaluations.status, ["completed", "partial"]),
        gte(evaluations.createdAt, new Date(sinceMs))
      )
    )
    .orderBy(desc(evaluations.createdAt))
    .limit(1)

  return evaluation ?? null
}
