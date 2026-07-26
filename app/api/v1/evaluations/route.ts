import { ZodError } from "zod";

import { ApiRouteError, errorResponseFor, jsonOk } from "@/lib/api-errors";
import { createEvaluationSchema } from "@/lib/evaluations/validation";
import { createEvaluationRecord } from "@/lib/evaluations/store";
import { toCreateEvaluationResponse } from "@/lib/evaluations/to-dto";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new ApiRouteError("VALIDATION_ERROR", "Request body must be valid JSON.");
    }

    const parsed = createEvaluationSchema.parse(body);
    const record = createEvaluationRecord(parsed.input, parsed.context ?? null);
    const response = toCreateEvaluationResponse(record);

    return jsonOk(response, { status: 201 });
  } catch (err) {
    if (err instanceof ZodError) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of err.issues) {
        const key = issue.path.join(".") || "input";
        fieldErrors[key] = issue.message;
      }
      return errorResponseFor(new ApiRouteError("VALIDATION_ERROR", "Invalid request body.", { fieldErrors }));
    }
    return errorResponseFor(err);
  }
}
