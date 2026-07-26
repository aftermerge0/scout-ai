import { inngest } from "@/inngest/client";
import { SECTION_KEYS, SECTION_TITLES, type ApiError, type SectionKey, type SummaryDto } from "@/lib/api-types";
import { resolveEntityLive } from "@/lib/collectors/entity";
import { collectExternalSources } from "@/lib/collectors/external";
import { collectOfficialSources } from "@/lib/collectors/official";
import { runSectionAgent, type AnySectionAgentResult, type SectionAgentResult } from "@/lib/agents/run-section-agent";
import { buildFindingsFromRiskAssessment } from "@/lib/agents/findings";
import * as repo from "@/lib/evaluations/repository";

const ANALYSIS_KEYS = SECTION_KEYS.filter((k) => k !== "executive_summary" && k !== "recommendation");

/**
 * Real research + reasoning pipeline (Phase 1-3). Triggered by
 * `POST /api/v1/evaluations` when `SCOUT_API_MODE=live` (see
 * app/api/v1/evaluations/route.ts). Every step persists via
 * `lib/evaluations/repository.ts` (Prisma) so `GET /api/v1/evaluations/:id`
 * can read progress at any point without depending on this function's
 * in-memory state.
 */
export const evaluateCompany = inngest.createFunction(
  { id: "evaluate-company", triggers: [{ event: "scout/evaluation.requested" }] },
  async ({ event, step }) => {
    const { evaluationId, input, context } = event.data as {
      evaluationId: string;
      input: string;
      context: import("@/lib/api-types").EvaluationContext | null;
    };

    const resolved = await step.run("resolve-entity", async () => {
      await repo.setPhase(evaluationId, "resolving_entity", "running");
      const entity = await resolveEntityLive(input);
      await repo.setEntity(evaluationId, entity);
      return entity;
    });

    const officialPages = await step.run("collect-official", async () => {
      await repo.setPhase(evaluationId, "collecting_official");
      if (!resolved.normalizedUrl) return [];
      const pages = await collectOfficialSources(resolved.normalizedUrl);
      await repo.addEvidence(
        evaluationId,
        pages.map((p) => ({
          sourceType: "official" as const,
          url: p.url,
          title: p.title,
          domain: resolved.domain,
          snippet: p.snippet,
          markdown: p.markdown,
          fetchedAt: p.fetchedAt,
        })),
      );
      return pages.map((p) => ({ url: p.url, title: p.title, snippet: p.snippet, markdown: p.markdown }));
    });

    const externalResults = await step.run("collect-external", async () => {
      await repo.setPhase(evaluationId, "collecting_external");
      const results = await collectExternalSources(resolved.companyName);
      await repo.addEvidence(
        evaluationId,
        results.map((r) => ({
          sourceType: "external" as const,
          url: r.url,
          title: r.title,
          domain: r.domain,
          snippet: r.snippet,
          markdown: r.markdown,
          fetchedAt: r.fetchedAt,
        })),
      );
      return results.map((r) => ({ url: r.url, title: r.title, snippet: r.snippet, markdown: r.markdown }));
    });

    if (officialPages.length === 0 && externalResults.length === 0) {
      await step.run("fail-no-evidence", async () => {
        const error: ApiError = {
          code: "PIPELINE_FAILED",
          message: "Could not collect any official or external sources for this input.",
          phase: "collecting_official",
        };
        await repo.markFailed(evaluationId, error);
      });
      return { evaluationId, status: "failed" as const };
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
    ];

    await step.run("set-phase-analyzing", async () => {
      await repo.setPhase(evaluationId, "analyzing", "running");
    });

    const sectionResults: Partial<Record<SectionKey, AnySectionAgentResult>> = {};
    for (const key of ANALYSIS_KEYS) {
      const outcome = await step.run(`analyze-${key}`, async () => {
        await repo.setSectionRunning(evaluationId, key);
        try {
          const result = await runSectionAgent({
            key,
            companyName: resolved.companyName,
            domain: resolved.domain,
            context,
            evidence: evidenceForAgents,
          });
          await repo.completeSection(evaluationId, key, result.data, result.confidence);
          return { ok: true as const, result };
        } catch (err) {
          const error: ApiError = {
            code: "DEPENDENCY_UNAVAILABLE",
            message: err instanceof Error ? err.message : `Failed to analyze ${SECTION_TITLES[key]}.`,
            phase: "analyzing",
          };
          await repo.failSection(evaluationId, key, error);
          return { ok: false as const };
        }
      });
      if (outcome.ok) sectionResults[key] = outcome.result;
    }

    await step.run("set-phase-recommending", async () => {
      await repo.setPhase(evaluationId, "recommending", "running");
    });

    const summaryAndFindings = await step.run("recommend", async () => {
      let recommendationResult: SectionAgentResult<"recommendation"> | null = null;
      let executiveSummaryResult: SectionAgentResult<"executive_summary"> | null = null;

      try {
        recommendationResult = await runSectionAgent({
          key: "recommendation",
          companyName: resolved.companyName,
          domain: resolved.domain,
          context,
          evidence: evidenceForAgents,
          priorSections: sectionResults,
        });
        await repo.completeSection(evaluationId, "recommendation", recommendationResult.data, recommendationResult.confidence);
      } catch (err) {
        await repo.failSection(evaluationId, "recommendation", {
          code: "DEPENDENCY_UNAVAILABLE",
          message: err instanceof Error ? err.message : "Failed to generate recommendation.",
          phase: "recommending",
        });
      }

      try {
        executiveSummaryResult = await runSectionAgent({
          key: "executive_summary",
          companyName: resolved.companyName,
          domain: resolved.domain,
          context,
          evidence: evidenceForAgents,
          priorSections: { ...sectionResults, ...(recommendationResult ? { recommendation: recommendationResult } : {}) },
        });
        await repo.completeSection(
          evaluationId,
          "executive_summary",
          executiveSummaryResult.data,
          executiveSummaryResult.confidence,
        );
      } catch (err) {
        await repo.failSection(evaluationId, "executive_summary", {
          code: "DEPENDENCY_UNAVAILABLE",
          message: err instanceof Error ? err.message : "Failed to generate executive summary.",
          phase: "recommending",
        });
      }

      const riskResult = sectionResults.risk_assessment as AnySectionAgentResult | undefined;
      if (riskResult) {
        const findings = buildFindingsFromRiskAssessment(
          riskResult.data as import("@/lib/api-types").RiskAssessmentData,
          riskResult.confidence,
        );
        await repo.addFindings(evaluationId, findings);
      }

      const anySectionFailed =
        !recommendationResult || !executiveSummaryResult || ANALYSIS_KEYS.some((k) => !sectionResults[k]);

      if (executiveSummaryResult && recommendationResult) {
        const summary: SummaryDto & { verdict: import("@/lib/api-types").RecommendationVerdict } = {
          overallScore: executiveSummaryResult.data.overallScore,
          verdict: recommendationResult.data.adopt,
          confidence: executiveSummaryResult.confidence,
          headline: executiveSummaryResult.data.headline,
          bestSuitedFor: executiveSummaryResult.data.bestSuitedFor,
          avoidIf: executiveSummaryResult.data.avoidIf,
        };
        if (anySectionFailed) {
          await repo.markPartial(evaluationId, summary);
        } else {
          await repo.markCompleted(evaluationId, summary);
        }
      } else {
        await repo.markPartial(evaluationId, null);
      }

      return { anySectionFailed };
    });

    return { evaluationId, status: summaryAndFindings.anySectionFailed ? ("partial" as const) : ("completed" as const) };
  },
);
