import { ApiRouteError, errorResponseFor, jsonOk } from "@/lib/api-errors";
import type { EvidenceItem } from "@/lib/api-types";
import { getEvaluationStore } from "@/lib/evaluations/store";
import { toEvidenceItems } from "@/lib/evaluations/to-dto";
import { evidenceQuerySchema } from "@/lib/evaluations/validation";

export const dynamic = "force-dynamic";

const evaluationStore = getEvaluationStore();

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

    const evaluation = await evaluationStore.get(id);
    if (!evaluation) {
      throw new ApiRouteError("NOT_FOUND", `No evaluation found with id "${id}".`);
    }
    allEvidence = toEvidenceItems(evaluation.evidence);

    const filtered = query.sourceType ? allEvidence.filter((item) => item.sourceType === query.sourceType) : allEvidence;
    const items = filtered.slice(0, query.limit);

    return jsonOk({ items, nextCursor: null });
  } catch (err) {
    return errorResponseFor(err);
  }
}
