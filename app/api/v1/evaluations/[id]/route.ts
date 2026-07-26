import { NextResponse } from "next/server";

import { ApiRouteError, errorResponseFor } from "@/lib/api-errors";
import { toEvaluationDtoFromDb } from "@/lib/evaluations/db-to-dto";
import { getEvaluationRecord } from "@/lib/evaluations/store";
import * as repo from "@/lib/evaluations/repository";
import { toEvaluationDto } from "@/lib/evaluations/to-dto";
import { includeEvidenceSchema } from "@/lib/evaluations/validation";
import { isLiveMode } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const url = new URL(request.url);
    const includeEvidence = includeEvidenceSchema.parse(url.searchParams.get("includeEvidence") ?? undefined);

    let dto;
    let etag;

    if (isLiveMode()) {
      const row = await repo.getEvaluationWithRelations(id);
      if (!row) {
        throw new ApiRouteError("NOT_FOUND", `No evaluation found with id "${id}".`);
      }
      ({ dto, etag } = toEvaluationDtoFromDb(row, { includeEvidence }));
    } else {
      const record = getEvaluationRecord(id);
      if (!record) {
        throw new ApiRouteError("NOT_FOUND", `No evaluation found with id "${id}".`);
      }
      ({ dto, etag } = toEvaluationDto(record, { includeEvidence }));
    }

    const ifNoneMatch = request.headers.get("if-none-match");
    if (ifNoneMatch && ifNoneMatch === etag) {
      return new NextResponse(null, { status: 304, headers: { ETag: etag } });
    }

    return NextResponse.json({ data: dto }, { status: 200, headers: { ETag: etag } });
  } catch (err) {
    return errorResponseFor(err);
  }
}
