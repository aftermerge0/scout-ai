import { getFirecrawl } from "@/lib/firecrawl";

export type OfficialPage = {
  url: string;
  title: string | null;
  snippet: string | null;
  markdown: string;
  fetchedAt: Date;
};

/**
 * Path-scoring keywords used to pick the most diligence-relevant pages out of
 * a full site map, so we scrape a small, high-signal set instead of the
 * whole site (keeps Firecrawl credit usage + latency bounded).
 */
const PATH_WEIGHTS: Array<{ pattern: RegExp; weight: number }> = [
  { pattern: /\/pricing/i, weight: 10 },
  { pattern: /\/security/i, weight: 10 },
  { pattern: /\/trust/i, weight: 9 },
  { pattern: /\/compliance/i, weight: 9 },
  { pattern: /\/docs?(\/|$)/i, weight: 8 },
  { pattern: /\/api(\/|$)/i, weight: 7 },
  { pattern: /\/status/i, weight: 6 },
  { pattern: /\/customers?|\/case-studies?/i, weight: 6 },
  { pattern: /\/integrations?/i, weight: 5 },
  { pattern: /\/changelog|\/release-notes/i, weight: 5 },
  { pattern: /\/about/i, weight: 5 },
  { pattern: /\/enterprise/i, weight: 5 },
  { pattern: /\/blog/i, weight: 3 },
  { pattern: /\/careers?/i, weight: 2 },
  { pattern: /\/legal|\/terms|\/privacy/i, weight: 1 },
];

const MAX_PAGES_MAPPED = 100;
const MAX_PAGES_SCRAPED = 8;
const SCRAPE_TIMEOUT_MS = 20_000;

function scorePath(url: string): number {
  let score = 0;
  for (const { pattern, weight } of PATH_WEIGHTS) {
    if (pattern.test(url)) score += weight;
  }
  return score;
}

function selectTopPaths(homeUrl: string, links: string[]): string[] {
  const unique = Array.from(new Set([homeUrl, ...links]));
  const scored = unique
    .map((url) => ({ url, score: scorePath(url) }))
    .sort((a, b) => b.score - a.score);

  const top = scored.filter((s) => s.url === homeUrl || s.score > 0).slice(0, MAX_PAGES_SCRAPED);
  if (!top.some((s) => s.url === homeUrl)) top.unshift({ url: homeUrl, score: 0 });
  return top.slice(0, MAX_PAGES_SCRAPED).map((s) => s.url);
}

/**
 * Maps the target domain, scores discovered paths for diligence relevance,
 * then scrapes the top pages as markdown. Individual scrape failures are
 * swallowed (best-effort) so one bad page doesn't fail the whole collection.
 */
export async function collectOfficialSources(homeUrl: string): Promise<OfficialPage[]> {
  let firecrawl: ReturnType<typeof getFirecrawl>;
  try {
    firecrawl = getFirecrawl();
  } catch {
    // Not configured (missing FIRECRAWL_API_KEY) — degrade to no official evidence
    // rather than failing the whole pipeline; the caller falls back to external-only.
    return [];
  }

  let links: string[] = [];
  try {
    const map = await firecrawl.map(homeUrl, { limit: MAX_PAGES_MAPPED });
    links = map.links.map((l) => l.url);
  } catch {
    // Map failed (e.g. robots.txt, unreachable) — fall back to homepage-only.
    links = [];
  }

  const targets = selectTopPaths(homeUrl, links);

  const results = await Promise.allSettled(
    targets.map(async (url) => {
      const doc = await firecrawl.scrape(url, { formats: ["markdown"], onlyMainContent: true, timeout: SCRAPE_TIMEOUT_MS });
      const markdown = doc.markdown?.trim();
      if (!markdown) return null;
      const page: OfficialPage = {
        url,
        title: doc.metadata?.title ?? null,
        snippet: (doc.metadata?.description ?? markdown.slice(0, 240)).trim(),
        markdown,
        fetchedAt: new Date(),
      };
      return page;
    }),
  );

  return results
    .filter((r): r is PromiseFulfilledResult<OfficialPage | null> => r.status === "fulfilled")
    .map((r) => r.value)
    .filter((page): page is OfficialPage => page !== null);
}
