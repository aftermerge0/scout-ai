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
const MAX_TOTAL_RESULTS = 32;

function buildQueries(companyName: string, domain: string | null): string[] {
  const identity = domain ? `${companyName} OR ${domain}` : companyName;
  return [
    // Leadership / company facts
    `${companyName} founder OR co-founder OR CEO`,
    `${companyName} company about founded headquarters employees funding`,
    // Review sites (employee + customer)
    `${companyName} site:glassdoor.com reviews`,
    `${companyName} site:ambitionbox.com reviews`,
    `${companyName} site:g2.com reviews`,
    `${companyName} site:capterra.com reviews`,
    `${companyName} site:linkedin.com/company`,
    // Community + competitive signals
    `${identity} reviews pros and cons`,
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

/** Prefer review / leadership sources when ranking into the result budget. */
function sourcePriority(domain: string | null): number {
  if (!domain) return 0;
  if (domain.includes("glassdoor.com")) return 10;
  if (domain.includes("ambitionbox.com")) return 10;
  if (domain.includes("g2.com")) return 9;
  if (domain.includes("capterra.com")) return 8;
  if (domain.includes("linkedin.com")) return 8;
  if (domain.includes("trustpilot.com")) return 7;
  if (domain.includes("crunchbase.com")) return 7;
  if (domain.includes("wikipedia.org")) return 6;
  if (domain.includes("news.ycombinator.com") || domain.includes("reddit.com")) return 5;
  return 1;
}

/**
 * Runs targeted Exa queries in parallel (founders, review sites, sentiment,
 * competitors, security, community, pricing, engineering) and merges/dedupes
 * into a single evidence list. Review and leadership sources are prioritized
 * when trimming to `MAX_TOTAL_RESULTS`.
 */
export async function collectExternalSources(
  companyName: string,
  domain: string | null = null,
): Promise<ExternalResult[]> {
  let exa: ReturnType<typeof getExa>;
  try {
    exa = getExa();
  } catch {
    // Not configured (missing EXA_API_KEY) — degrade to no external evidence.
    return [];
  }

  const queries = buildQueries(companyName, domain);

  const settled = await Promise.allSettled(
    queries.map((query) =>
      exa.search(query, {
        type: "auto",
        numResults: RESULTS_PER_QUERY,
        contents: { text: { maxCharacters: 2500 }, summary: true },
      }),
    ),
  );

  const seen = new Set<string>();
  const merged: ExternalResult[] = [];

  for (const outcome of settled) {
    if (outcome.status !== "fulfilled") continue;
    for (const result of outcome.value.results) {
      if (seen.has(result.url)) continue;
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

  merged.sort((a, b) => sourcePriority(b.domain) - sourcePriority(a.domain));
  return merged.slice(0, MAX_TOTAL_RESULTS);
}
