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
  { pattern: /\/pricing|\/plans?|\/billing|\/buy(\/?|$)/i, weight: 10 },
  { pattern: /\/security|\/trust-?center|\/trustcenter/i, weight: 10 },
  { pattern: /\/trust(\/?|$)/i, weight: 9 },
  { pattern: /\/compliance/i, weight: 9 },
  // About/team only — avoid `/company/blog` stealing scrape slots.
  { pattern: /\/(about|team|founders?|people|leadership)(\/?|$)/i, weight: 11 },
  { pattern: /\/company(\/?|$)/i, weight: 11 },
  { pattern: /\/docs?(\/|$)/i, weight: 8 },
  { pattern: /\/api(\/|$)/i, weight: 7 },
  { pattern: /\/status/i, weight: 6 },
  { pattern: /\/customers?|\/case-studies?/i, weight: 6 },
  { pattern: /\/integrations?/i, weight: 5 },
  { pattern: /\/changelog|\/release-notes/i, weight: 5 },
  { pattern: /\/enterprise/i, weight: 5 },
  { pattern: /\/blog/i, weight: 3 },
  { pattern: /\/careers?/i, weight: 3 },
  { pattern: /\/legal|\/terms|\/privacy/i, weight: 1 },
];

type PathFamily = "pricing" | "security" | "about" | "docs" | "customers" | "other";

const FAMILY_PATTERNS: Array<{ family: PathFamily; pattern: RegExp }> = [
  { family: "pricing", pattern: /\/pricing|\/plans?|\/billing|\/buy(\/?|$)/i },
  { family: "security", pattern: /\/security|\/trust|\/compliance/i },
  { family: "about", pattern: /\/(about|team|founders?|people|leadership|company)(\/?|$)/i },
  { family: "docs", pattern: /\/docs?(\/|$)|\/api(\/|$)|\/changelog|\/status/i },
  { family: "customers", pattern: /\/customers?|\/case-studies?/i },
];

const MAX_PAGES_MAPPED = 100;
const MAX_PAGES_SCRAPED = 10;
const SCRAPE_TIMEOUT_MS = 20_000;
const FAMILY_QUOTA: Partial<Record<PathFamily, number>> = {
  pricing: 1,
  security: 1,
  about: 1,
  docs: 1,
  customers: 1,
};

function scorePath(url: string): number {
  let score = 0;
  for (const { pattern, weight } of PATH_WEIGHTS) {
    if (pattern.test(url)) score += weight;
  }
  return score;
}

function pathFamily(url: string): PathFamily {
  for (const { family, pattern } of FAMILY_PATTERNS) {
    if (pattern.test(url)) return family;
  }
  return "other";
}

/**
 * Prefer diversity across diligence families so blogs/docs don't crowd out
 * the single pricing/security/about page.
 */
function selectTopPaths(homeUrl: string, links: string[]): string[] {
  const unique = Array.from(new Set([homeUrl, ...links]));
  const scored = unique
    .map((url) => ({ url, score: scorePath(url), family: pathFamily(url) }))
    .sort((a, b) => b.score - a.score);

  const eligible = scored.filter((s) => s.url === homeUrl || s.score > 0);
  const selected: typeof eligible = [];
  const selectedUrls = new Set<string>();
  const familyCounts: Record<PathFamily, number> = {
    pricing: 0,
    security: 0,
    about: 0,
    docs: 0,
    customers: 0,
    other: 0,
  };

  const push = (item: (typeof eligible)[number]) => {
    if (selectedUrls.has(item.url) || selected.length >= MAX_PAGES_SCRAPED) return;
    selected.push(item);
    selectedUrls.add(item.url);
    familyCounts[item.family] += 1;
  };

  const home = eligible.find((s) => s.url === homeUrl);
  if (home) push(home);

  // First pass: one slot per high-value family when available.
  for (const [family, quota] of Object.entries(FAMILY_QUOTA) as Array<[PathFamily, number]>) {
    const need = quota - familyCounts[family];
    if (need <= 0) continue;
    for (const item of eligible) {
      if (item.family !== family) continue;
      if (selectedUrls.has(item.url)) continue;
      push(item);
      if (familyCounts[family] >= quota) break;
    }
  }

  // Fill remainder by score — blogs/careers are low-signal; hard-cap each at 1.
  for (const item of eligible) {
    if (selected.length >= MAX_PAGES_SCRAPED) break;
    const isBlog = /\/blog/i.test(item.url);
    const isCareer = /\/careers?/i.test(item.url);
    if (isBlog && selected.filter((s) => /\/blog/i.test(s.url)).length >= 1) continue;
    if (isCareer && selected.filter((s) => /\/careers?/i.test(s.url)).length >= 1) continue;
    push(item);
  }

  return selected.slice(0, MAX_PAGES_SCRAPED).map((s) => s.url);
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
      const doc = await firecrawl.scrape(url, {
        formats: ["markdown"],
        onlyMainContent: true,
        timeout: SCRAPE_TIMEOUT_MS,
      });
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
