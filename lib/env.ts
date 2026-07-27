import { z } from "zod";

/**
 * Centralized, validated environment configuration.
 *
 * Every process.env access for backend config should go through this module
 * instead of reading `process.env.X` directly, so:
 *  - required capability vars are checked in one place
 *  - misconfiguration fails fast with a clear message instead of a deep
 *    "undefined is not a function" error inside a collector/agent
 *  - `.env` stays the single source of truth (see `.env.example`)
 */

const rawEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).optional(),

  DATABASE_URL: z.string().min(1).optional(),

  FIRECRAWL_API_KEY: z.string().min(1).optional(),
  FIRECRAWL_API_URL: z.string().url().optional(),

  EXA_API_KEY: z.string().min(1).optional(),

  AZURE_OPENAI_API_KEY: z.string().min(1).optional(),
  AZURE_OPENAI_ENDPOINT: z.string().min(1).optional(),
  AZURE_OPENAI_DEPLOYMENT: z.string().min(1).optional(),
  AZURE_OPENAI_API_VERSION: z.string().min(1).optional(),

  // Used by the `lib/ai.ts` frontend AI chat; kept alongside the
  // AZURE_OPENAI_* vars above (used by the backend evaluation pipeline,
  // lib/azure-openai.ts) since both can point at the same Azure OpenAI
  // resource but are read differently.
  AZURE_RESOURCE_NAME: z.string().min(1).optional(),
  AZURE_API_KEY: z.string().min(1).optional(),
  AZURE_DEPLOYMENT_NAME: z.string().min(1).optional(),

  INNGEST_EVENT_KEY: z.string().min(1).optional(),
  INNGEST_SIGNING_KEY: z.string().min(1).optional(),

  // Best-effort in-memory rate limit / dedupe knobs. Safe defaults if unset;
  // see lib/evaluations/rate-limit.ts.
  SCOUT_RATE_LIMIT_PER_MINUTE: z.coerce.number().int().positive().default(5),
  SCOUT_DEDUPE_WINDOW_HOURS: z.coerce.number().int().positive().default(24),
});

export type Env = z.infer<typeof rawEnvSchema>;

type GlobalWithEnv = typeof globalThis & { __scoutEnv?: Env };

function loadEnv(): Env {
  const g = globalThis as GlobalWithEnv;
  if (g.__scoutEnv) return g.__scoutEnv;

  // A blank var in .env means "not configured", not "configured as empty".
  // Without this, placeholder lines like `EXA_API_KEY=` fail `.min(1)` and
  // take down every route instead of just disabling that capability.
  const source = Object.fromEntries(
    Object.entries(process.env).filter(([, value]) => value !== ""),
  );

  const parsed = rawEnvSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}\n\nCheck .env against .env.example.`);
  }

  g.__scoutEnv = parsed.data;
  return parsed.data;
}

export const env = loadEnv();

/** Groups of env vars required for each capability, keyed for error messages. */
const CAPABILITY_REQUIREMENTS = {
  database: ["DATABASE_URL"] as const,
  firecrawl: ["FIRECRAWL_API_KEY"] as const,
  exa: ["EXA_API_KEY"] as const,
  azureOpenAI: ["AZURE_OPENAI_API_KEY", "AZURE_OPENAI_ENDPOINT", "AZURE_OPENAI_DEPLOYMENT"] as const,
} satisfies Record<string, readonly (keyof Env)[]>;

export type Capability = keyof typeof CAPABILITY_REQUIREMENTS;

/** Returns the missing env var names for a given capability, or [] if fully configured. */
export function missingConfigFor(capability: Capability): string[] {
  return CAPABILITY_REQUIREMENTS[capability].filter((key) => !env[key]);
}

/** Throws a clear, actionable error if a capability is missing required config. */
export function assertConfiguredFor(capability: Capability): void {
  const missing = missingConfigFor(capability);
  if (missing.length > 0) {
    throw new Error(
      `${missing.join(", ")} must be set (see .env.example). Missing for: ${capability}.`,
    );
  }
}

/** Capabilities that are missing configuration right now. */
export function allMissingConfig(): Partial<Record<Capability, string[]>> {
  const result: Partial<Record<Capability, string[]>> = {};
  for (const capability of Object.keys(CAPABILITY_REQUIREMENTS) as Capability[]) {
    const missing = missingConfigFor(capability);
    if (missing.length > 0) result[capability] = missing;
  }
  return result;
}
