import { generateObject } from "ai";
import { z } from "zod";

import type { EvaluationContext, SectionData, SectionDataByKey, SectionKey } from "@/lib/api-types";
import { getAzureModel } from "@/lib/azure-openai";
import { BASE_SYSTEM_PROMPT, buildSectionUserPrompt } from "@/lib/agents/prompts";
import { SECTION_SCHEMAS } from "@/lib/agents/schemas";

export type AgentEvidence = {
  id: string;
  sourceType: "official" | "external";
  url: string;
  title: string | null;
  snippet: string | null;
  markdown: string | null;
};

const MAX_MARKDOWN_CHARS_PER_ITEM = 2200;
const MAX_EVIDENCE_ITEMS = 36;

function buildEvidenceBlock(evidence: AgentEvidence[]): string {
  return evidence
    .slice(0, MAX_EVIDENCE_ITEMS)
    .map((e) => {
      const body = (e.markdown ?? e.snippet ?? "").slice(0, MAX_MARKDOWN_CHARS_PER_ITEM);
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
    evidenceBlock: buildEvidenceBlock(evidence),
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
