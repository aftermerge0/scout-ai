import { resolveEntity, type ResolvedEntity } from "@/lib/evaluations/domain";
import { getExa } from "@/lib/exa";

/**
 * Resolves free-text company names (no URL/domain given) to a homepage by
 * asking Exa for the top "company" result. URL/domain inputs are resolved
 * purely locally (see `resolveEntity`) — Exa is only used as a fallback.
 */
export async function resolveEntityLive(rawInput: string): Promise<ResolvedEntity> {
  const resolved = resolveEntity(rawInput);
  if (resolved.domain) return resolved;

  try {
    const exa = getExa();
    const result = await exa.search(`${resolved.companyName} official website`, {
      type: "auto",
      numResults: 1,
      category: "company",
      contents: {},
    });
    const top = result.results[0];
    if (!top) return resolved;

    const domain = new URL(top.url).hostname.replace(/^www\./, "");
    return {
      ...resolved,
      domain,
      normalizedUrl: `https://${domain}`,
      companyName: top.title?.trim() || resolved.companyName,
    };
  } catch {
    return resolved;
  }
}
