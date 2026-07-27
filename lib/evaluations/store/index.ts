import { isLiveMode } from "@/lib/env";
import { createDrizzleEvaluationStore } from "@/lib/evaluations/store/drizzle";
import { createMemoryEvaluationStore } from "@/lib/evaluations/store/memory";
import type { EvaluationStore, EvaluationStoreMode } from "@/lib/evaluations/store/types";

export type {
  EvaluationCreateResult,
  EvaluationSnapshot,
  EvaluationSnapshotEvidence,
  EvaluationSnapshotProgress,
  EvaluationSnapshotSection,
  EvaluationStore,
  EvaluationStoreMode,
} from "@/lib/evaluations/store/types";

const mode: EvaluationStoreMode = isLiveMode() ? "drizzle" : "memory";
const store: EvaluationStore = mode === "drizzle" ? createDrizzleEvaluationStore() : createMemoryEvaluationStore();

/**
 * Route read/create paths go through this seam. Pipeline writes still call
 * repository.ts directly and should move behind EvaluationStore in Candidate 03.
 */
export function getEvaluationStore(): EvaluationStore {
  return store;
}

export function getEvaluationStoreMode(): EvaluationStoreMode {
  return mode;
}
