import { jsonOk } from "@/lib/api-errors";
import { allMissingLiveModeConfig, env } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET() {
  return jsonOk({
    ok: true,
    version: "1.0.0",
    time: new Date().toISOString(),
    // Additive, non-contract fields for operational debugging.
    mode: env.SCOUT_API_MODE,
    missingLiveModeConfig: env.SCOUT_API_MODE === "live" ? allMissingLiveModeConfig() : undefined,
  });
}
