import {
  SECTION_KEYS,
  SECTION_TITLES,
  type ApiError,
  type EvaluationContext,
  type RecommendationVerdict,
  type RiskAssessmentData,
  type SectionKey,
  type SummaryDto,
} from "@/lib/api-types"
import { buildFindingsFromRiskAssessment } from "@/lib/agents/findings"
import {
  runSectionAgent,
  type AnySectionAgentResult,
  type SectionAgentResult,
} from "@/lib/agents/run-section-agent"
import { collectExternalSources } from "@/lib/collectors/external"
import { collectOfficialSources } from "@/lib/collectors/official"
import { resolveEntityLive } from "@/lib/collectors/entity"
import * as repo from "@/lib/evaluations/repository"

const ANALYSIS_KEYS = SECTION_KEYS.filter(
  (k) => k !== "executive_summary" && k !== "recommendation"
)

export type RunPipelineArgs = {
  evaluationId: string
  input: string
  context: EvaluationContext | null
}

export type RunPipelineResult = {
  evaluationId: string
  status: "completed" | "partial" | "failed"
}

/**
 * The real research + reasoning pipeline.
 *
 * Every stage writes through `repository.ts` before moving on, so
 * `GET /api/v1/evaluations/:id` reflects live progress and the caller never
 * needs to hold this function's state. That also means a crash mid-run leaves
 * a readable, partially-filled report rather than a blank one.
 *
 * Invoked via `after()` from the create route so the POST can return 201
 * immediately. There is no retry: a failed stage is recorded on the row and
 * the run ends.
 */
export async function runEvaluationPipeline({
  evaluationId,
  input,
  context,
}: RunPipelineArgs): Promise<RunPipelineResult> {
  try {
    await repo.setPhase(evaluationId, "resolving_entity", "running")
    const resolved = await resolveEntityLive(input)
    await repo.setEntity(evaluationId, resolved)

    // --- Collect -----------------------------------------------------------
    await repo.setPhase(evaluationId, "collecting_official")
    const officialPages = resolved.normalizedUrl
      ? await collectOfficialSources(resolved.normalizedUrl)
      : []
    if (officialPages.length > 0) {
      await repo.addEvidence(
        evaluationId,
        officialPages.map((p) => ({
          sourceType: "official" as const,
          url: p.url,
          title: p.title,
          domain: resolved.domain,
          snippet: p.snippet,
          markdown: p.markdown,
          fetchedAt: p.fetchedAt,
        }))
      )
    }

    await repo.setPhase(evaluationId, "collecting_external")
    const externalResults = await collectExternalSources(resolved.companyName)
    if (externalResults.length > 0) {
      await repo.addEvidence(
        evaluationId,
        externalResults.map((r) => ({
          sourceType: "external" as const,
          url: r.url,
          title: r.title,
          domain: r.domain,
          snippet: r.snippet,
          markdown: r.markdown,
          fetchedAt: r.fetchedAt,
        }))
      )
    }

    if (officialPages.length === 0 && externalResults.length === 0) {
      await repo.markFailed(evaluationId, {
        code: "PIPELINE_FAILED",
        message:
          "Could not collect any official or external sources for this input.",
        phase: "collecting_official",
      })
      return { evaluationId, status: "failed" }
    }

    const evidenceForAgents = [
      ...officialPages.map((p, i) => ({
        id: `official-${i}`,
        sourceType: "official" as const,
        url: p.url,
        title: p.title,
        snippet: p.snippet,
        markdown: p.markdown,
      })),
      ...externalResults.map((r, i) => ({
        id: `external-${i}`,
        sourceType: "external" as const,
        url: r.url,
        title: r.title,
        snippet: r.snippet,
        markdown: r.markdown,
      })),
    ]

    // --- Analyze -----------------------------------------------------------
    await repo.setPhase(evaluationId, "analyzing", "running")
    const sectionResults: Partial<Record<SectionKey, AnySectionAgentResult>> = {}

    for (const key of ANALYSIS_KEYS) {
      await repo.setSectionRunning(evaluationId, key)
      try {
        const result = await runSectionAgent({
          key,
          companyName: resolved.companyName,
          domain: resolved.domain,
          context,
          evidence: evidenceForAgents,
        })
        await repo.completeSection(
          evaluationId,
          key,
          result.data,
          result.confidence
        )
        sectionResults[key] = result
      } catch (err) {
        // One failed section degrades the report to `partial`; it does not
        // abort the run.
        const error: ApiError = {
          code: "DEPENDENCY_UNAVAILABLE",
          message:
            err instanceof Error
              ? err.message
              : `Failed to analyze ${SECTION_TITLES[key]}.`,
          phase: "analyzing",
        }
        await repo.failSection(evaluationId, key, error)
      }
    }

    // --- Recommend ---------------------------------------------------------
    await repo.setPhase(evaluationId, "recommending", "running")

    let recommendationResult: SectionAgentResult<"recommendation"> | null = null
    try {
      recommendationResult = await runSectionAgent({
        key: "recommendation",
        companyName: resolved.companyName,
        domain: resolved.domain,
        context,
        evidence: evidenceForAgents,
        priorSections: sectionResults,
      })
      await repo.completeSection(
        evaluationId,
        "recommendation",
        recommendationResult.data,
        recommendationResult.confidence
      )
    } catch (err) {
      await repo.failSection(evaluationId, "recommendation", {
        code: "DEPENDENCY_UNAVAILABLE",
        message:
          err instanceof Error
            ? err.message
            : "Failed to generate recommendation.",
        phase: "recommending",
      })
    }

    let executiveSummaryResult: SectionAgentResult<"executive_summary"> | null =
      null
    try {
      executiveSummaryResult = await runSectionAgent({
        key: "executive_summary",
        companyName: resolved.companyName,
        domain: resolved.domain,
        context,
        evidence: evidenceForAgents,
        priorSections: {
          ...sectionResults,
          ...(recommendationResult
            ? { recommendation: recommendationResult }
            : {}),
        },
      })
      await repo.completeSection(
        evaluationId,
        "executive_summary",
        executiveSummaryResult.data,
        executiveSummaryResult.confidence
      )
    } catch (err) {
      await repo.failSection(evaluationId, "executive_summary", {
        code: "DEPENDENCY_UNAVAILABLE",
        message:
          err instanceof Error
            ? err.message
            : "Failed to generate executive summary.",
        phase: "recommending",
      })
    }

    const riskResult = sectionResults.risk_assessment
    if (riskResult) {
      await repo.addFindings(
        evaluationId,
        buildFindingsFromRiskAssessment(
          riskResult.data as RiskAssessmentData,
          riskResult.confidence
        )
      )
    }

    const anySectionFailed =
      !recommendationResult ||
      !executiveSummaryResult ||
      ANALYSIS_KEYS.some((k) => !sectionResults[k])

    if (executiveSummaryResult && recommendationResult) {
      const summary: SummaryDto & { verdict: RecommendationVerdict } = {
        overallScore: executiveSummaryResult.data.overallScore,
        verdict: recommendationResult.data.adopt,
        confidence: executiveSummaryResult.confidence,
        headline: executiveSummaryResult.data.headline,
        bestSuitedFor: executiveSummaryResult.data.bestSuitedFor,
        avoidIf: executiveSummaryResult.data.avoidIf,
      }
      if (anySectionFailed) {
        await repo.markPartial(evaluationId, summary)
      } else {
        await repo.markCompleted(evaluationId, summary)
      }
    } else {
      await repo.markPartial(evaluationId, null)
    }

    return {
      evaluationId,
      status: anySectionFailed ? "partial" : "completed",
    }
  } catch (err) {
    // Anything uncaught above (entity resolution, a collector, the database)
    // still has to leave the row in a terminal state, or the client polls
    // until it times out.
    await repo
      .markFailed(evaluationId, {
        code: "PIPELINE_FAILED",
        message: err instanceof Error ? err.message : "Evaluation failed.",
      })
      .catch(() => {})
    return { evaluationId, status: "failed" }
  }
}
