import { generateObject } from "ai";
import { z } from "zod";

import type { EvaluationContext, SectionData, SectionDataByKey, SectionKey } from "@/lib/api-types";
import { getAzureModel } from "@/lib/azure-openai";
import { BASE_SYSTEM_PROMPT, SECTION_GUIDANCE } from "@/lib/agents/prompts";
import { SECTION_SCHEMAS } from "@/lib/agents/schemas";

export type AgentEvidence = {
  id: string;
  sourceType: "official" | "external";
  url: string;
  title: string | null;
  snippet: string | null;
  markdown: string | null;
};

const MAX_MARKDOWN_CHARS_PER_ITEM = 1800;
const MAX_EVIDENCE_ITEMS = 30;

function buildEvidenceBlock(evidence: AgentEvidence[]): string {
  return evidence
    .slice(0, MAX_EVIDENCE_ITEMS)
    .map((e) => {
      const body = (e.markdown ?? e.snippet ?? "").slice(0, MAX_MARKDOWN_CHARS_PER_ITEM);
      return `--- evidenceId: ${e.id} | source: ${e.sourceType} | url: ${e.url}\n${e.title ? `title: ${e.title}\n` : ""}${body}`;
    })
    .join("\n\n");
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

  const contextLine = context
    ? `Buyer context: ${[
        context.useCase ? `use case = ${context.useCase}` : null,
        context.companySize ? `company size = ${context.companySize}` : null,
        context.priorities?.length ? `priorities = ${context.priorities.join(", ")}` : null,
      ]
        .filter(Boolean)
        .join("; ")}`
    : "Buyer context: none provided.";

  const priorSectionsBlock =
    priorSections && Object.keys(priorSections).length > 0
      ? `\n\nAlready-completed analysis from other sections (use to synthesize, do not contradict without reason):\n${Object.entries(
          priorSections,
        )
          .map(([sectionKey, result]) => `[${sectionKey}] (confidence ${result?.confidence}): ${JSON.stringify(result?.data)}`)
          .join("\n")}`
      : "";

  const prompt = `Company: ${companyName}${domain ? ` (${domain})` : ""}
${contextLine}

Section to produce: "${key}"
Section guidance: ${SECTION_GUIDANCE[key]}

Evidence (cite evidenceId values in your claims/evidenceIds fields; do not invent evidenceIds):
${buildEvidenceBlock(evidence) || "(no evidence collected for this company)"}${priorSectionsBlock}`;

  const { object } = await generateObject({
    model: getAzureModel(),
    schema: wrapperSchema,
    system: BASE_SYSTEM_PROMPT,
    prompt,
  });

  return { data: object.data as SectionDataByKey[K], confidence: object.confidence };
}
