import { getExa } from "@/lib/exa";

import { isOnTopicResult } from "./relevance";

export type ExternalResult = {
  url: string;
  title: string | null;
  domain: string | null;
  snippet: string | null;
  markdown: string | null;
  fetchedAt: Date;
};

const RESULTS_PER_QUERY = 4;
const MAX_TOTAL_RESULTS = 36;

type SearchSpec = {
  query: string;
  includeDomains?: string[];
  numResults?: number;
};

function buildSearches(companyName: string, domain: string | null): SearchSpec[] {
  const identity = domain ? `${companyName} OR ${domain}` : companyName;
  const quoted = `"${companyName}"`;
  return [
    // Leadership / company facts
    { query: `${quoted} founder OR co-founder OR CEO OR "founded by"` },
    { query: `${quoted} company about founded headquarters employees funding` },
    {
      query: `${quoted} company`,
      includeDomains: ["crunchbase.com", "en.wikipedia.org"],
      numResults: 5,
    },
    // Employee reviews (Glassdoor / AmbitionBox) — domain-scoped; Glassdoor
    // often indexes salary/DEI pages first; we extract the company id and
    // Firecrawl-scrape the Reviews URL in enrichReviewSources.
    {
      query: `${quoted} Glassdoor`,
      includeDomains: ["glassdoor.com"],
      numResults: 6,
    },
    {
      query: `${quoted} reviews rating employees`,
      includeDomains: ["ambitionbox.com"],
      numResults: 5,
    },
    // Customer / product reviews
    {
      query: `${quoted} reviews`,
      includeDomains: ["g2.com"],
      numResults: 5,
    },
    {
      query: `${quoted} reviews`,
      includeDomains: ["capterra.com"],
      numResults: 4,
    },
    {
      query: `${quoted}`,
      includeDomains: ["linkedin.com/company", "linkedin.com/in"],
      numResults: 5,
    },
    // Community + competitive signals
    { query: `${identity} reviews pros and cons` },
    { query: `${quoted} vs alternatives competitors` },
    { query: `${quoted} security incident OR data breach` },
    {
      query: `${quoted}`,
      includeDomains: ["news.ycombinator.com", "reddit.com"],
      numResults: 5,
    },
    { query: `${quoted} pricing complaints too expensive` },
    { query: `${quoted} engineering blog API changelog reliability` },
  ];
}

function hostnameOf(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

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

function isReviewDomain(domain: string | null): boolean {
  if (!domain) return false;
  return /(glassdoor|ambitionbox|g2|capterra|trustpilot)\./i.test(domain);
}

/**
 * Runs targeted Exa queries in parallel (founders, review sites, sentiment,
 * competitors, security, community, pricing, engineering) and merges/dedupes
 * into a single evidence list. Review-site searches use includeDomains so
 * near-name collisions (Verto vs Vercel) are far less likely.
 */
export async function collectExternalSources(
  companyName: string,
  domain: string | null = null,
): Promise<ExternalResult[]> {
  let exa: ReturnType<typeof getExa>;
  try {
    exa = getExa();
  } catch {
    return [];
  }

  const searches = buildSearches(companyName, domain);

  const settled = await Promise.allSettled(
    searches.map((spec) =>
      exa.search(spec.query, {
        type: "auto",
        numResults: spec.numResults ?? RESULTS_PER_QUERY,
        ...(spec.includeDomains ? { includeDomains: spec.includeDomains } : {}),
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
      const item: ExternalResult = {
        url: result.url,
        title: result.title,
        domain: hostnameOf(result.url),
        snippet: summary ?? (text ? text.slice(0, 280) : null),
        markdown: text ?? summary ?? null,
        fetchedAt: new Date(),
      };
      if (isReviewDomain(item.domain) && !isOnTopicResult(item, companyName, domain)) {
        continue;
      }
      merged.push(item);
    }
  }

  merged.sort((a, b) => sourcePriority(b.domain) - sourcePriority(a.domain));
  return merged.slice(0, MAX_TOTAL_RESULTS);
}
