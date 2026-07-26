import { NextResponse } from "next/server";

import type { ApiError, ApiErrorBody, ApiOkBody, ErrorCode, EvaluationPhase } from "@/lib/api-types";

const STATUS_BY_CODE: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 400,
  NOT_FOUND: 404,
  ALREADY_EXISTS: 409,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
  DEPENDENCY_UNAVAILABLE: 503,
  PIPELINE_FAILED: 500,
};

export class ApiRouteError extends Error {
  readonly code: ErrorCode;
  readonly details?: Record<string, unknown>;
  readonly phase?: EvaluationPhase;

  constructor(code: ErrorCode, message: string, details?: Record<string, unknown>, phase?: EvaluationPhase) {
    super(message);
    this.code = code;
    this.details = details;
    this.phase = phase;
  }

  toApiError(): ApiError {
    return {
      code: this.code,
      message: this.message,
      ...(this.details ? { details: this.details } : {}),
      ...(this.phase ? { phase: this.phase } : {}),
    };
  }
}

export function jsonOk<T>(data: T, init?: ResponseInit): NextResponse<ApiOkBody<T>> {
  return NextResponse.json({ data }, init);
}

export function jsonError(
  code: ErrorCode,
  message: string,
  details?: Record<string, unknown>,
): NextResponse<ApiErrorBody> {
  const error: ApiError = { code, message, ...(details ? { details } : {}) };
  return NextResponse.json({ error }, { status: STATUS_BY_CODE[code] });
}

export function errorResponseFor(err: unknown): NextResponse<ApiErrorBody> {
  if (err instanceof ApiRouteError) {
    return NextResponse.json({ error: err.toApiError() }, { status: STATUS_BY_CODE[err.code] });
  }

  console.error("[scout] unhandled route error", err);
  return jsonError("INTERNAL_ERROR", "Something went wrong while processing this request.");
}
