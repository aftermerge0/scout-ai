import { getExa } from "@/lib/exa";

export type ExternalResult = {
  url: string;
  title: string | null;
  domain: string | null;
  snippet: string | null;
  markdown: string | null;
  fetchedAt: Date;
};

const RESULTS_PER_QUERY = 4;
const MAX_TOTAL_RESULTS = 24;

function buildQueries(companyName: string): string[] {
  return [
    `${companyName} reviews pros and cons`,
    `${companyName} vs alternatives competitors`,
    `${companyName} security incident OR data breach`,
    `${companyName} discussion site:news.ycombinator.com OR site:reddit.com`,
    `${companyName} pricing complaints too expensive`,
    `${companyName} engineering blog API changelog reliability`,
  ];
}

function hostnameOf(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

/**
 * Runs a small set of targeted Exa queries in parallel (sentiment,
 * competitors, security, community discussion, pricing, engineering) and
 * merges/dedupes the results into a single evidence list. Bounded by
 * `MAX_TOTAL_RESULTS` to keep credit usage and prompt size predictable.
 */
export async function collectExternalSources(companyName: string): Promise<ExternalResult[]> {
  let exa: ReturnType<typeof getExa>;
  try {
    exa = getExa();
  } catch {
    // Not configured (missing EXA_API_KEY) — degrade to no external evidence.
    return [];
  }

  const queries = buildQueries(companyName);

  const settled = await Promise.allSettled(
    queries.map((query) =>
      exa.search(query, {
        type: "auto",
        numResults: RESULTS_PER_QUERY,
        contents: { text: { maxCharacters: 2000 }, summary: true },
      }),
    ),
  );

  const seen = new Set<string>();
  const merged: ExternalResult[] = [];

  for (const outcome of settled) {
    if (outcome.status !== "fulfilled") continue;
    for (const result of outcome.value.results) {
      if (seen.has(result.url) || merged.length >= MAX_TOTAL_RESULTS) continue;
      seen.add(result.url);
      const text = "text" in result ? (result.text as string) : null;
      const summary = "summary" in result ? (result.summary as string) : null;
      merged.push({
        url: result.url,
        title: result.title,
        domain: hostnameOf(result.url),
        snippet: summary ?? (text ? text.slice(0, 280) : null),
        markdown: text ?? summary ?? null,
        fetchedAt: new Date(),
      });
    }
  }

  return merged;
}
