import { randomUUID } from "node:crypto";

import type { Finding, RiskAssessmentData } from "@/lib/api-types";

/**
 * Derives the contract's top-level `findings` list from the risk_assessment
 * section's `topRisks`, enriched with a best-guess category by matching
 * shared evidenceIds against the section's per-category breakdown.
 */
export function buildFindingsFromRiskAssessment(risk: RiskAssessmentData, sectionConfidence: number): Finding[] {
  return risk.topRisks.map((topRisk) => {
    const matchingCategory = risk.categories.find((c) =>
      c.evidenceIds.some((id) => topRisk.evidenceIds.includes(id)),
    );

    return {
      id: randomUUID(),
      category: matchingCategory?.category ?? "product",
      severity: topRisk.severity,
      title: topRisk.title,
      summary: topRisk.summary,
      confidence: sectionConfidence,
      evidenceIds: topRisk.evidenceIds,
      sectionKey: "risk_assessment",
    };
  });
}
