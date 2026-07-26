import type {
  ApiErrorBody,
  CreatedEvaluation,
  Evaluation,
  EvaluationContext,
  EvidencePage,
  EvidenceSourceType,
} from "@/types/scout-api"

import { mockCreateEvaluation, mockGetEvaluation } from "./mocks"

export const USE_MOCKS = process.env.NEXT_PUBLIC_USE_API_MOCKS === "true"

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? ""

export class ScoutApiError extends Error {
  readonly code: string
  readonly status: number
  readonly details?: Record<string, unknown>

  constructor(status: number, body: ApiErrorBody["error"]) {
    super(body.message)
    this.name = "ScoutApiError"
    this.status = status
    this.code = body.code
    this.details = body.details
  }
}

async function unwrap<T>(res: Response): Promise<T> {
  const json = await res.json().catch(() => null)
  if (!res.ok) {
    const error = (json as ApiErrorBody | null)?.error
    throw new ScoutApiError(res.status, {
      code: error?.code ?? "INTERNAL_ERROR",
      message: error?.message ?? `Request failed with ${res.status}`,
      details: error?.details,
    })
  }
  return (json as { data: T }).data
}

export async function startEvaluation(
  input: string,
  context?: EvaluationContext
): Promise<CreatedEvaluation> {
  if (USE_MOCKS) return mockCreateEvaluation(input)

  const res = await fetch(`${API_BASE}/api/v1/evaluations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(context ? { input, context } : { input }),
  })
  return unwrap<CreatedEvaluation>(res)
}

export type PollResult =
  | { notModified: true }
  | { notModified: false; data: Evaluation; etag: string | null }

export async function getEvaluation(
  id: string,
  etag?: string | null,
  signal?: AbortSignal
): Promise<PollResult> {
  if (USE_MOCKS) return mockGetEvaluation(id, etag)

  const res = await fetch(
    `${API_BASE}/api/v1/evaluations/${id}?includeEvidence=summary`,
    {
      headers: etag ? { "If-None-Match": etag } : undefined,
      cache: "no-store",
      signal,
    }
  )
  if (res.status === 304) return { notModified: true }
  const data = await unwrap<Evaluation>(res)
  return { notModified: false, data, etag: res.headers.get("ETag") }
}

export async function getEvidence(
  id: string,
  options: {
    sourceType?: EvidenceSourceType
    limit?: number
    cursor?: string
  } = {}
): Promise<EvidencePage> {
  const params = new URLSearchParams()
  if (options.sourceType) params.set("sourceType", options.sourceType)
  if (options.limit) params.set("limit", String(options.limit))
  if (options.cursor) params.set("cursor", options.cursor)
  const query = params.size > 0 ? `?${params}` : ""

  const res = await fetch(
    `${API_BASE}/api/v1/evaluations/${id}/evidence${query}`
  )
  return unwrap<EvidencePage>(res)
}
