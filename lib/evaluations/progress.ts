import { SECTION_KEYS, type EvaluationPhase, type EvaluationStatus, type SectionKey, type SectionStatus } from "@/lib/api-types";

/**
 * Pure, time-based progress simulation for the Phase 0 stub pipeline.
 *
 * Every value is derived from `elapsed = now - createdAt`, so progress can be
 * recomputed on every request without relying on timers or process-lifetime
 * state. This is what makes the stub safe to run on serverless: as long as
 * the record (id/createdAt/etc.) is retrievable, progress is reproducible.
 */

export const STUB_TIMELINE = {
  resolvingEntityEnd: 3_000,
  officialEnd: 9_000,
  externalEnd: 15_000,
  sectionDurationMs: 2_000,
  recommendEnd: 40_000,
  queuedWindowMs: 800,
  failAt: 5_000,
} as const;

const TIMELINE = STUB_TIMELINE;

const ANALYSIS_SECTION_KEYS: SectionKey[] = SECTION_KEYS.filter(
  (key) => key !== "executive_summary" && key !== "recommendation",
);

const analyzingEnd = TIMELINE.externalEnd + ANALYSIS_SECTION_KEYS.length * TIMELINE.sectionDurationMs;

export type SimulatedProgress = {
  status: EvaluationStatus;
  phase: EvaluationPhase;
  percent: number;
  phases: Array<{ key: Exclude<EvaluationPhase, "queued" | "done" | "failed">; status: SectionStatus }>;
  sectionStatuses: Record<SectionKey, SectionStatus>;
  sectionsCompleted: number;
  sectionsTotal: number;
  failedAtPhase: EvaluationPhase | null;
};

function lerp(elapsed: number, start: number, end: number, pctStart: number, pctEnd: number): number {
  if (elapsed <= start) return pctStart;
  if (elapsed >= end) return pctEnd;
  const t = (elapsed - start) / (end - start);
  return Math.round(pctStart + t * (pctEnd - pctStart));
}

export function computeProgress(createdAtMs: number, nowMs: number, willFail: boolean): SimulatedProgress {
  const elapsed = Math.max(0, nowMs - createdAtMs);
  const sectionsTotal = SECTION_KEYS.length;

  if (willFail && elapsed >= TIMELINE.failAt) {
    return {
      status: "failed",
      phase: "failed",
      percent: 20,
      phases: [
        { key: "resolving_entity", status: "completed" },
        { key: "collecting_official", status: "failed" },
        { key: "collecting_external", status: "pending" },
        { key: "analyzing", status: "pending" },
        { key: "recommending", status: "pending" },
      ],
      sectionStatuses: Object.fromEntries(SECTION_KEYS.map((key) => [key, "pending"])) as Record<
        SectionKey,
        SectionStatus
      >,
      sectionsCompleted: 0,
      sectionsTotal,
      failedAtPhase: "collecting_official",
    };
  }

  if (elapsed < TIMELINE.queuedWindowMs) {
    return {
      status: "queued",
      phase: "queued",
      percent: 0,
      phases: [
        { key: "resolving_entity", status: "pending" },
        { key: "collecting_official", status: "pending" },
        { key: "collecting_external", status: "pending" },
        { key: "analyzing", status: "pending" },
        { key: "recommending", status: "pending" },
      ],
      sectionStatuses: Object.fromEntries(SECTION_KEYS.map((key) => [key, "pending"])) as Record<
        SectionKey,
        SectionStatus
      >,
      sectionsCompleted: 0,
      sectionsTotal,
      failedAtPhase: null,
    };
  }

  const sectionStatuses = {} as Record<SectionKey, SectionStatus>;
  let sectionsCompleted = 0;

  ANALYSIS_SECTION_KEYS.forEach((key, index) => {
    const start = TIMELINE.externalEnd + index * TIMELINE.sectionDurationMs;
    const end = start + TIMELINE.sectionDurationMs;
    let status: SectionStatus;
    if (elapsed >= end) {
      status = "completed";
      sectionsCompleted += 1;
    } else if (elapsed >= start) {
      status = "running";
    } else {
      status = "pending";
    }
    sectionStatuses[key] = status;
  });

  const recommendPhaseDone = elapsed >= TIMELINE.recommendEnd;
  const recommendPhaseRunning = elapsed >= analyzingEnd && !recommendPhaseDone;
  sectionStatuses.executive_summary = recommendPhaseDone ? "completed" : recommendPhaseRunning ? "running" : "pending";
  sectionStatuses.recommendation = recommendPhaseDone ? "completed" : recommendPhaseRunning ? "running" : "pending";
  if (recommendPhaseDone) sectionsCompleted += 2;

  let phase: EvaluationPhase;
  let percent: number;
  if (elapsed < TIMELINE.resolvingEntityEnd) {
    phase = "resolving_entity";
    percent = lerp(elapsed, 0, TIMELINE.resolvingEntityEnd, 0, 10);
  } else if (elapsed < TIMELINE.officialEnd) {
    phase = "collecting_official";
    percent = lerp(elapsed, TIMELINE.resolvingEntityEnd, TIMELINE.officialEnd, 10, 30);
  } else if (elapsed < TIMELINE.externalEnd) {
    phase = "collecting_external";
    percent = lerp(elapsed, TIMELINE.officialEnd, TIMELINE.externalEnd, 30, 45);
  } else if (elapsed < analyzingEnd) {
    phase = "analyzing";
    percent = lerp(elapsed, TIMELINE.externalEnd, analyzingEnd, 45, 90);
  } else if (elapsed < TIMELINE.recommendEnd) {
    phase = "recommending";
    percent = lerp(elapsed, analyzingEnd, TIMELINE.recommendEnd, 90, 100);
  } else {
    phase = "done";
    percent = 100;
  }

  const phases: SimulatedProgress["phases"] = [
    { key: "resolving_entity", status: elapsed >= TIMELINE.resolvingEntityEnd ? "completed" : "running" },
    {
      key: "collecting_official",
      status:
        elapsed >= TIMELINE.officialEnd ? "completed" : elapsed >= TIMELINE.resolvingEntityEnd ? "running" : "pending",
    },
    {
      key: "collecting_external",
      status: elapsed >= TIMELINE.externalEnd ? "completed" : elapsed >= TIMELINE.officialEnd ? "running" : "pending",
    },
    {
      key: "analyzing",
      status: elapsed >= analyzingEnd ? "completed" : elapsed >= TIMELINE.externalEnd ? "running" : "pending",
    },
    {
      key: "recommending",
      status: recommendPhaseDone ? "completed" : recommendPhaseRunning ? "running" : "pending",
    },
  ];

  return {
    status: recommendPhaseDone ? "completed" : "running",
    phase,
    percent,
    phases,
    sectionStatuses,
    sectionsCompleted,
    sectionsTotal,
    failedAtPhase: null,
  };
}
