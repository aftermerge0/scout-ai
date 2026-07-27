import { NextResponse } from "next/server";

import { ApiRouteError, errorResponseFor } from "@/lib/api-errors";
import { getEvaluationStore } from "@/lib/evaluations/store";
import { toEvaluationDto } from "@/lib/evaluations/to-dto";
import { includeEvidenceSchema } from "@/lib/evaluations/validation";

export const dynamic = "force-dynamic";

const evaluationStore = getEvaluationStore();

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const url = new URL(request.url);
    const includeEvidence = includeEvidenceSchema.parse(url.searchParams.get("includeEvidence") ?? undefined);

    const evaluation = await evaluationStore.get(id);
    if (!evaluation) {
      throw new ApiRouteError("NOT_FOUND", `No evaluation found with id "${id}".`);
    }
    const { dto, etag } = toEvaluationDto(evaluation, { includeEvidence });

    const ifNoneMatch = request.headers.get("if-none-match");
    if (ifNoneMatch && ifNoneMatch === etag) {
      return new NextResponse(null, { status: 304, headers: { ETag: etag } });
    }

    return NextResponse.json({ data: dto }, { status: 200, headers: { ETag: etag } });
  } catch (err) {
    return errorResponseFor(err);
  }
}
