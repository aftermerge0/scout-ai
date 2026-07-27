import { getFirecrawl } from "@/lib/firecrawl";

import type { ExternalResult } from "./external";

const REVIEW_HOSTS = [
  "glassdoor.com",
  "ambitionbox.com",
  "g2.com",
  "capterra.com",
  "trustpilot.com",
  "linkedin.com",
] as const;

const MAX_REVIEW_PAGES = 6;
const SCRAPE_TIMEOUT_MS = 20_000;

function isReviewUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return REVIEW_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
  } catch {
    return false;
  }
}

/**
 * Deep-scrapes review-site URLs discovered by Exa so agents get full
 * ratings/quotes instead of search snippets alone. Best-effort: failures
 * are skipped and existing Exa markdown is kept.
 */
export async function enrichReviewSources(
  external: ExternalResult[],
): Promise<ExternalResult[]> {
  let firecrawl: ReturnType<typeof getFirecrawl>;
  try {
    firecrawl = getFirecrawl();
  } catch {
    return external;
  }

  const reviewCandidates = external
    .filter((r) => isReviewUrl(r.url))
    .slice(0, MAX_REVIEW_PAGES);

  if (reviewCandidates.length === 0) return external;

  const scrapedByUrl = new Map<string, ExternalResult>();

  const settled = await Promise.allSettled(
    reviewCandidates.map(async (candidate) => {
      const doc = await firecrawl.scrape(candidate.url, {
        formats: ["markdown"],
        onlyMainContent: true,
        timeout: SCRAPE_TIMEOUT_MS,
      });
      const markdown = doc.markdown?.trim();
      if (!markdown || markdown.length < 120) return null;
      const enriched: ExternalResult = {
        ...candidate,
        title: doc.metadata?.title ?? candidate.title,
        snippet: (doc.metadata?.description ?? markdown.slice(0, 280)).trim(),
        markdown,
        fetchedAt: new Date(),
      };
      return enriched;
    }),
  );

  for (const outcome of settled) {
    if (outcome.status !== "fulfilled" || !outcome.value) continue;
    scrapedByUrl.set(outcome.value.url, outcome.value);
  }

  if (scrapedByUrl.size === 0) return external;

  return external.map((item) => scrapedByUrl.get(item.url) ?? item);
}
