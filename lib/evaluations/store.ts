import { generateEvaluationContent, type GeneratedContent } from "@/lib/evaluations/generate-content";
import { resolveEntity, type ResolvedEntity } from "@/lib/evaluations/domain";
import type { EvaluationContext } from "@/lib/api-types";

export type EvaluationRecord = {
  id: string;
  input: string;
  context: EvaluationContext | null;
  createdAt: number;
  resolved: ResolvedEntity;
  content: GeneratedContent;
};

/**
 * In-memory evaluation store for the Phase 0 stub pipeline.
 *
 * This intentionally has no external persistence: it exists to unblock
 * frontend development against the exact `/api/v1` contract shape before
 * durable Postgres + Inngest path is wired in. Records only live for the
 * lifetime of a single warm server process (fine for local dev; on
 * serverless this may not survive across cold starts/instances).
 *
 * Stub-mode only: live mode persists `Evaluation` rows plus generated
 * section/evidence data through `lib/evaluations/repository.ts`.
 */

type StoreGlobal = typeof globalThis & {
  __scoutEvaluationStore?: Map<string, EvaluationRecord>;
};

function getStore(): Map<string, EvaluationRecord> {
  const g = globalThis as StoreGlobal;
  if (!g.__scoutEvaluationStore) {
    g.__scoutEvaluationStore = new Map();
  }
  return g.__scoutEvaluationStore;
}

export function createEvaluationRecord(input: string, context: EvaluationContext | null): EvaluationRecord {
  const id = crypto.randomUUID();
  const createdAt = Date.now();
  const resolved = resolveEntity(input);
  const content = generateEvaluationContent({
    companyName: resolved.companyName,
    domain: resolved.domain,
    normalizedUrl: resolved.normalizedUrl,
    createdAt,
  });

  const record: EvaluationRecord = { id, input, context, createdAt, resolved, content };
  getStore().set(id, record);
  return record;
}

export function getEvaluationRecord(id: string): EvaluationRecord | undefined {
  return getStore().get(id);
}
