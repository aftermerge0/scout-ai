import { z } from "zod";

export const createEvaluationSchema = z.object({
  input: z.string().trim().min(2, "input must be at least 2 characters").max(200, "input must be at most 200 characters"),
  context: z
    .object({
      useCase: z.string().max(500).optional(),
      companySize: z.enum(["1-50", "51-200", "201-1000", "1000+"]).optional(),
      priorities: z.array(z.string()).max(8).optional(),
    })
    .optional(),
});

export type CreateEvaluationInput = z.infer<typeof createEvaluationSchema>;

export const evidenceQuerySchema = z.object({
  sourceType: z.enum(["official", "external"]).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional().default(100),
  cursor: z.string().optional(),
});

export const includeEvidenceSchema = z.enum(["summary", "none", "full"]).optional().default("summary");
