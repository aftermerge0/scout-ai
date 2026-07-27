import { createDrizzleEvaluationStore } from "@/lib/evaluations/store/drizzle";
import type { EvaluationStore } from "@/lib/evaluations/store/types";

export type {
  EvaluationCreateResult,
  EvaluationSnapshot,
  EvaluationSnapshotEvidence,
  EvaluationSnapshotProgress,
  EvaluationSnapshotSection,
  EvaluationStore,
} from "@/lib/evaluations/store/types";

const store: EvaluationStore = createDrizzleEvaluationStore();

/**
 * Route read/create paths go through this seam. Pipeline writes still call
 * repository.ts directly and should move behind EvaluationStore in Candidate 03.
 */
export function getEvaluationStore(): EvaluationStore {
  return store;
}
