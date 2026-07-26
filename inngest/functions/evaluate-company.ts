import { inngest } from "@/inngest/client";

/**
 * Phase 1 skeleton for the real research pipeline.
 *
 * Not wired into the API yet: `POST /api/v1/evaluations` currently uses the
 * in-memory stub (see lib/evaluations/store.ts) so the frontend has a
 * working contract today. This function documents the intended durable
 * steps; each `step.run` will be filled in with real Firecrawl/Exa/Azure
 * calls plus Prisma writes in Phase 1-3, at which point the API route will
 * switch from the stub store to emitting this event.
 */
export const evaluateCompany = inngest.createFunction(
  { id: "evaluate-company", triggers: [{ event: "scout/evaluation.requested" }] },
  async ({ event, step }) => {
    const { evaluationId } = event.data as { evaluationId: string };

    await step.run("resolve-entity", async () => {
      // TODO(Phase 1): normalize input, Azure call to extract company/domain, persist via Prisma.
      return { evaluationId };
    });

    await step.run("collect-official", async () => {
      // TODO(Phase 2): Firecrawl map + scrape, persist Evidence rows.
    });

    await step.run("collect-external", async () => {
      // TODO(Phase 2): parallel Exa queries, persist Evidence rows.
    });

    await step.run("analyze-sections", async () => {
      // TODO(Phase 3): fan out Azure OpenAI section agents, persist ReportSection rows.
    });

    await step.run("recommend", async () => {
      // TODO(Phase 3): recommendation agent + findings + top-level summary.
    });

    await step.run("finalize", async () => {
      // TODO(Phase 3): mark evaluation completed/partial/failed.
    });

    return { evaluationId, status: "completed" as const };
  },
);
