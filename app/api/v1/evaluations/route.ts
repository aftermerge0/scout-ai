import { after } from "next/server";
import { ZodError } from "zod";

import { ApiRouteError, errorResponseFor, jsonOk } from "@/lib/api-errors";
import type { CreateEvaluationResponse, EvaluationContext } from "@/lib/api-types";
import { resolveEntity } from "@/lib/evaluations/domain";
import { createEvaluationSchema } from "@/lib/evaluations/validation";
import { getEvaluationStore } from "@/lib/evaluations/store";
import { toCreateEvaluationResponse } from "@/lib/evaluations/to-dto";
import { clientIpFrom, checkRateLimit } from "@/lib/evaluations/rate-limit";
import { runEvaluationPipeline } from "@/lib/evaluations/run-pipeline";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";
// The pipeline runs in `after()`, inside this invocation's budget.
export const maxDuration = 300;

const evaluationStore = getEvaluationStore();

/** Compares the requested context against a stored context for cache-hit eligibility. */
function contextsMatch(a: EvaluationContext | null, b: EvaluationContext | null): boolean {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

export async function POST(request: Request) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new ApiRouteError("VALIDATION_ERROR", "Request body must be valid JSON.");
    }

    const parsed = createEvaluationSchema.parse(body);
    const context = parsed.context ?? null;

    if (!checkRateLimit(clientIpFrom(request))) {
      throw new ApiRouteError("RATE_LIMITED", "Too many evaluation requests. Please wait a moment and try again.");
    }

    const resolved = resolveEntity(parsed.input);
    let cacheHit = false;
    let responseBody: CreateEvaluationResponse;

    const dedupeWindowMs = env.SCOUT_DEDUPE_WINDOW_HOURS * 60 * 60 * 1000;
    const existing = resolved.domain
      ? await evaluationStore.findRecentByDomain(resolved.domain, Date.now() - dedupeWindowMs)
      : null;

    if (existing && contextsMatch(context, existing.context)) {
      cacheHit = true;
      responseBody = toCreateEvaluationResponse(existing);
    } else {
      const evaluation = await evaluationStore.create(parsed.input, context);
      // Respond 201 now; the pipeline keeps running after the response and
      // reports progress by writing to the evaluation row.
      after(async () => {
        await runEvaluationPipeline({
          evaluationId: evaluation.id,
          input: parsed.input,
          context,
        });
      });
      responseBody = toCreateEvaluationResponse(evaluation);
    }

    return jsonOk(responseBody, { status: 201, headers: { "X-Scout-Cache": cacheHit ? "HIT" : "MISS" } });
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
