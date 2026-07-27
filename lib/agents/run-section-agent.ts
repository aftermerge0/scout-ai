import { generateObject } from "ai";
import { z } from "zod";

import type { EvaluationContext, SectionData, SectionDataByKey, SectionKey } from "@/lib/api-types";
import { getAzureModel } from "@/lib/azure-openai";
import { BASE_SYSTEM_PROMPT, buildSectionUserPrompt } from "@/lib/agents/prompts";
import { SECTION_SCHEMAS } from "@/lib/agents/schemas";
import {
  evidenceCharBudget,
  isCompetitorEvidence,
  isEngineeringEvidence,
  isLeadershipEvidence,
  isPricingEvidence,
  isSecurityEvidence,
  truncateEvidenceText,
} from "@/lib/collectors/evidence-text";

export type AgentEvidence = {
  id: string;
  sourceType: "official" | "external";
  url: string;
  title: string | null;
  snippet: string | null;
  markdown: string | null;
};

const MAX_EVIDENCE_ITEMS = 36;

const REVIEW_PATH = /\/(reviews?|ratings?)(\/?|$|\?)/i;
const REVIEW_DOMAIN = /(glassdoor|ambitionbox|g2|capterra|trustpilot)\./i;

function isReviewEvidence(e: AgentEvidence): boolean {
  if (REVIEW_DOMAIN.test(e.url)) return true;
  return REVIEW_PATH.test(e.url);
}

function sortByRelevance(
  evidence: AgentEvidence[],
  score: (e: AgentEvidence) => number,
): AgentEvidence[] {
  return [...evidence].sort((a, b) => score(b) - score(a));
}

/** Surface the pages each section needs first — same failure mode as buried founders. */
export function prioritizeEvidenceForSection(
  evidence: AgentEvidence[],
  sectionKey: SectionKey,
): AgentEvidence[] {
  switch (sectionKey) {
    case "company_overview":
      return sortByRelevance(evidence, (e) => {
        let score = isLeadershipEvidence(e) ? 10 : 0;
        if (e.sourceType === "official" && isLeadershipEvidence(e)) score += 3;
        return score;
      });
    case "community_sentiment":
      return sortByRelevance(evidence, (e) => (isReviewEvidence(e) ? 10 : 0));
    case "pricing_intelligence":
      return sortByRelevance(evidence, (e) => {
        let score = isPricingEvidence(e) ? 10 : 0;
        if (isCompetitorEvidence(e)) score += 3;
        return score;
      });
    case "security_compliance":
      return sortByRelevance(evidence, (e) => (isSecurityEvidence(e) ? 10 : 0));
    case "competitor_analysis":
      return sortByRelevance(evidence, (e) => (isCompetitorEvidence(e) ? 10 : 0));
    case "engineering_health":
      return sortByRelevance(evidence, (e) => (isEngineeringEvidence(e) ? 10 : 0));
    case "feature_analysis":
    case "product_overview":
      return sortByRelevance(evidence, (e) => {
        let score = 0;
        if (isEngineeringEvidence(e)) score += 6;
        if (isPricingEvidence(e)) score += 2;
        if (e.sourceType === "official") score += 2;
        return score;
      });
    case "executive_summary":
    case "recommendation":
    case "risk_assessment":
      return evidence;
    default: {
      const _exhaustive: never = sectionKey;
      return _exhaustive;
    }
  }
}

function buildEvidenceBlock(evidence: AgentEvidence[], sectionKey: SectionKey): string {
  const ordered = prioritizeEvidenceForSection(evidence, sectionKey);
  return ordered
    .slice(0, MAX_EVIDENCE_ITEMS)
    .map((e) => {
      const raw = e.markdown ?? e.snippet ?? "";
      const body = truncateEvidenceText(raw, evidenceCharBudget(e));
      return `--- evidenceId: ${e.id} | source: ${e.sourceType} | url: ${e.url}\n${e.title ? `title: ${e.title}\n` : ""}${body}`;
    })
    .join("\n\n");
}

/** Models sometimes emit 0-1 fractions; contract requires 0-100 integers. */
function normalizeConfidence(value: number): number {
  if (!Number.isFinite(value)) return 0;
  const scaled = value > 0 && value <= 1 ? value * 100 : value;
  return Math.max(0, Math.min(100, Math.round(scaled)));
}

function normalizeClaimConfidences<T>(data: T): T {
  if (!data || typeof data !== "object") return data;
  const record = data as Record<string, unknown>;
  if (!Array.isArray(record.claims)) return data;
  return {
    ...record,
    claims: record.claims.map((claim) => {
      if (!claim || typeof claim !== "object") return claim;
      const c = claim as Record<string, unknown>;
      if (typeof c.confidence !== "number") return claim;
      return { ...c, confidence: normalizeConfidence(c.confidence) };
    }),
  } as T;
}

export type SectionAgentResult<K extends SectionKey = SectionKey> = {
  data: SectionDataByKey[K];
  confidence: number;
};

export type AnySectionAgentResult = { data: SectionData; confidence: number };

/**
 * Runs a single section's structured-output agent call against Azure
 * OpenAI. Wraps the section's contract schema with a top-level `confidence`
 * field (kept separate from `data` because `ReportSection.confidence` is
 * stored as its own DB column / DTO field, not inside `data`).
 */
export async function runSectionAgent<K extends SectionKey>(params: {
  key: K;
  companyName: string;
  domain: string | null;
  context: EvaluationContext | null;
  evidence: AgentEvidence[];
  /** Completed sibling sections (used by executive_summary/recommendation to synthesize). */
  priorSections?: Partial<Record<SectionKey, AnySectionAgentResult>>;
}): Promise<SectionAgentResult<K>> {
  const { key, companyName, domain, context, evidence, priorSections } = params;

  const sectionSchema = SECTION_SCHEMAS[key] as unknown as z.ZodType<SectionDataByKey[K]>;
  const wrapperSchema = z.object({
    confidence: z.number().min(0).max(100),
    data: sectionSchema,
  });

  const priorSectionsBlock =
    priorSections && Object.keys(priorSections).length > 0
      ? `\n\n## Prior sections\nUse to synthesize where relevant; do not contradict without citing new evidence.\n${Object.entries(
          priorSections,
        )
          .map(([sectionKey, result]) => `[${sectionKey}] (confidence ${result?.confidence}): ${JSON.stringify(result?.data)}`)
          .join("\n")}`
      : "";

  const prompt = buildSectionUserPrompt({
    key,
    companyName,
    domain,
    context,
    evidenceBlock: buildEvidenceBlock(evidence, key),
    priorSectionsBlock,
  });

  const { object } = await generateObject({
    model: getAzureModel(),
    schema: wrapperSchema,
    system: BASE_SYSTEM_PROMPT,
    prompt,
  });

  return {
    data: normalizeClaimConfidences(object.data) as SectionDataByKey[K],
    confidence: normalizeConfidence(object.confidence),
  };
}
