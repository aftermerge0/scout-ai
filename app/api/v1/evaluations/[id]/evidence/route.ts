import { ApiRouteError, errorResponseFor, jsonOk } from "@/lib/api-errors";
import type { EvidenceItem } from "@/lib/api-types";
import { getEvaluationRecord } from "@/lib/evaluations/store";
import * as repo from "@/lib/evaluations/repository";
import { evidenceQuerySchema } from "@/lib/evaluations/validation";
import { isLiveMode } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const url = new URL(request.url);
    const query = evidenceQuerySchema.parse({
      sourceType: url.searchParams.get("sourceType") ?? undefined,
      limit: url.searchParams.get("limit") ?? undefined,
      cursor: url.searchParams.get("cursor") ?? undefined,
    });

    let allEvidence: EvidenceItem[];

    if (isLiveMode()) {
      const row = await repo.getEvaluationWithRelations(id);
      if (!row) {
        throw new ApiRouteError("NOT_FOUND", `No evaluation found with id "${id}".`);
      }
      allEvidence = row.evidence.map((e) => ({
        id: e.id,
        sourceType: e.sourceType as EvidenceItem["sourceType"],
        url: e.url,
        title: e.title,
        domain: e.domain,
        snippet: e.snippet,
        fetchedAt: e.fetchedAt.toISOString(),
      }));
    } else {
      const record = getEvaluationRecord(id);
      if (!record) {
        throw new ApiRouteError("NOT_FOUND", `No evaluation found with id "${id}".`);
      }
      allEvidence = record.content.evidence;
    }

    const filtered = query.sourceType ? allEvidence.filter((item) => item.sourceType === query.sourceType) : allEvidence;
    const items = filtered.slice(0, query.limit);

    return jsonOk({ items, nextCursor: null });
  } catch (err) {
    return errorResponseFor(err);
  }
}
