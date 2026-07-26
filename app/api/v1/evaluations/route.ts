import { ZodError } from "zod";

import { inngest } from "@/inngest/client";
import { ApiRouteError, errorResponseFor, jsonOk } from "@/lib/api-errors";
import type { CreateEvaluationResponse } from "@/lib/api-types";
import { resolveEntity } from "@/lib/evaluations/domain";
import { createEvaluationSchema } from "@/lib/evaluations/validation";
import { createEvaluationRecord } from "@/lib/evaluations/store";
import * as repo from "@/lib/evaluations/repository";
import { toCreateEvaluationResponse } from "@/lib/evaluations/to-dto";
import { clientIpFrom, checkRateLimit } from "@/lib/evaluations/rate-limit";
import { env, isLiveMode } from "@/lib/env";

export const dynamic = "force-dynamic";

/** Compares the requested context against a stored `contextJson` value for cache-hit eligibility. */
function contextsMatch(a: import("@/lib/api-types").EvaluationContext | null, storedContextJson: unknown): boolean {
  return JSON.stringify(a ?? null) === JSON.stringify(storedContextJson ?? null);
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

    if (!isLiveMode()) {
      const record = createEvaluationRecord(parsed.input, context);
      return jsonOk(toCreateEvaluationResponse(record), { status: 201 });
    }

    const resolved = resolveEntity(parsed.input);
    let cacheHit = false;
    let responseBody: CreateEvaluationResponse;

    const dedupeWindowMs = env.SCOUT_DEDUPE_WINDOW_HOURS * 60 * 60 * 1000;
    const existing = resolved.domain
      ? await repo.findRecentByDomain(resolved.domain, Date.now() - dedupeWindowMs)
      : null;

    if (existing && contextsMatch(context, existing.contextJson)) {
      cacheHit = true;
      responseBody = {
        id: existing.id,
        status: existing.status as CreateEvaluationResponse["status"],
        phase: existing.phase as CreateEvaluationResponse["phase"],
        input: existing.input,
        normalizedUrl: existing.normalizedUrl,
        companyName: existing.companyName,
        domain: existing.domain,
        createdAt: existing.createdAt.toISOString(),
        reportUrl: `/report/${existing.id}`,
        pollAfterMs: 0,
      };
    } else {
      const evaluation = await repo.createEvaluation(parsed.input, context);
      await inngest.send({
        name: "scout/evaluation.requested",
        data: { evaluationId: evaluation.id, input: parsed.input, context },
      });
      responseBody = {
        id: evaluation.id,
        status: "queued",
        phase: "queued",
        input: evaluation.input,
        normalizedUrl: null,
        companyName: null,
        domain: null,
        createdAt: evaluation.createdAt.toISOString(),
        reportUrl: `/report/${evaluation.id}`,
        pollAfterMs: 2000,
      };
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
