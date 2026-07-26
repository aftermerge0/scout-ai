import { ApiRouteError, errorResponseFor, jsonOk } from "@/lib/api-errors";
import { getEvaluationRecord } from "@/lib/evaluations/store";
import { evidenceQuerySchema } from "@/lib/evaluations/validation";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const record = getEvaluationRecord(id);
    if (!record) {
      throw new ApiRouteError("NOT_FOUND", `No evaluation found with id "${id}".`);
    }

    const url = new URL(request.url);
    const query = evidenceQuerySchema.parse({
      sourceType: url.searchParams.get("sourceType") ?? undefined,
      limit: url.searchParams.get("limit") ?? undefined,
      cursor: url.searchParams.get("cursor") ?? undefined,
    });

    const filtered = query.sourceType
      ? record.content.evidence.filter((item) => item.sourceType === query.sourceType)
      : record.content.evidence;

    const items = filtered.slice(0, query.limit);

    return jsonOk({ items, nextCursor: null });
  } catch (err) {
    return errorResponseFor(err);
  }
}
