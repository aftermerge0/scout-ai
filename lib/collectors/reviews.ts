import { getFirecrawl } from "@/lib/firecrawl";

import type { ExternalResult } from "./external";
import {
  companyTokens,
  isOnTopicResult,
  mentionsCompany,
} from "./relevance";

const REVIEW_HOSTS = [
  "glassdoor.com",
  "ambitionbox.com",
  "g2.com",
  "capterra.com",
  "trustpilot.com",
] as const;

const MAX_REVIEW_PAGES = 8;
const SCRAPE_TIMEOUT_MS = 25_000;

function hostnameOf(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function isReviewHost(url: string): boolean {
  const host = hostnameOf(url);
  if (!host) return false;
  return REVIEW_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
}

/**
 * From Glassdoor/AmbitionBox/G2 hits, synthesize canonical review URLs so we
 * scrape ratings pages instead of DEI/salary/interview side pages.
 */
export function expandCanonicalReviewUrls(
  external: ExternalResult[],
  companyName: string,
  domain: string | null,
): string[] {
  const urls = new Set<string>();
  const slug = companyName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const tokens = companyTokens(companyName, domain);

  for (const item of external) {
    if (!isReviewHost(item.url)) continue;
    if (!isOnTopicResult(item, companyName, domain)) continue;

    const host = hostnameOf(item.url) ?? "";

    if (host.includes("glassdoor.com")) {
      const idMatch = item.url.match(/E(\d{4,})/i);
      if (idMatch) {
        const id = idMatch[1];
        const nameSlug = companyName.replace(/\s+/g, "-");
        urls.add(`https://www.glassdoor.com/Reviews/${nameSlug}-Reviews-E${id}.htm`);
        urls.add(
          `https://www.glassdoor.com/Overview/Working-at-${nameSlug}-EI_IE${id}.htm`,
        );
      } else if (/\/Reviews\//i.test(item.url) && mentionsCompany(item.url, tokens)) {
        urls.add(item.url.split("?")[0]!);
      }
    }

    if (host.includes("ambitionbox.com")) {
      if (/\/reviews\//i.test(item.url) && mentionsCompany(item.url, tokens)) {
        urls.add(item.url.split("?")[0]!);
      }
      const overview = item.url.match(/\/overview\/([a-z0-9-]+)-overview/i);
      if (overview && mentionsCompany(overview[1]!, tokens)) {
        urls.add(`https://www.ambitionbox.com/reviews/${overview[1]}-reviews`);
      }
      if (slug) {
        urls.add(`https://www.ambitionbox.com/reviews/${slug}-reviews`);
      }
    }

    if (host.includes("g2.com")) {
      if (/\/products\//i.test(item.url) || /\/sellers\//i.test(item.url)) {
        urls.add(item.url.split("?")[0]!);
      }
    }

    if (
      host.includes("capterra.com") &&
      /\/reviews/i.test(item.url) &&
      mentionsCompany(item.url + (item.title ?? ""), tokens)
    ) {
      urls.add(item.url.split("?")[0]!);
    }
  }

  if (slug.length >= 3) {
    urls.add(`https://www.ambitionbox.com/reviews/${slug}-reviews`);
    urls.add(`https://www.g2.com/products/${slug}/reviews`);
  }

  return Array.from(urls).slice(0, MAX_REVIEW_PAGES);
}

/**
 * Deep-scrapes review-site URLs (discovered + canonicalized) so agents get
 * full ratings/quotes instead of search snippets alone. Best-effort.
 */
export async function enrichReviewSources(
  external: ExternalResult[],
  companyName: string,
  domain: string | null = null,
): Promise<ExternalResult[]> {
  let firecrawl: ReturnType<typeof getFirecrawl>;
  try {
    firecrawl = getFirecrawl();
  } catch {
    return external.filter(
      (r) => isOnTopicResult(r, companyName, domain) || !isReviewHost(r.url),
    );
  }

  const filtered = external.filter((r) => {
    if (!isReviewHost(r.url)) return true;
    return isOnTopicResult(r, companyName, domain);
  });

  const canonical = expandCanonicalReviewUrls(filtered, companyName, domain);
  const existingUrls = new Set(filtered.map((r) => r.url));
  const toScrape = [
    ...filtered.filter((r) => isReviewHost(r.url)).map((r) => r.url),
    ...canonical.filter((u) => !existingUrls.has(u)),
  ].slice(0, MAX_REVIEW_PAGES);

  if (toScrape.length === 0) return filtered;

  const scrapedByUrl = new Map<string, ExternalResult>();
  const tokens = companyTokens(companyName, domain);

  const settled = await Promise.allSettled(
    toScrape.map(async (url) => {
      const doc = await firecrawl.scrape(url, {
        formats: ["markdown"],
        onlyMainContent: true,
        timeout: SCRAPE_TIMEOUT_MS,
      });
      const markdown = doc.markdown?.trim();
      if (!markdown || markdown.length < 120) return null;
      if (
        !mentionsCompany(
          `${url} ${doc.metadata?.title ?? ""} ${markdown.slice(0, 400)}`,
          tokens,
        )
      ) {
        return null;
      }
      const enriched: ExternalResult = {
        url,
        title: doc.metadata?.title ?? null,
        domain: hostnameOf(url),
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

  if (scrapedByUrl.size === 0) return filtered;

  const merged = filtered.map((item) => scrapedByUrl.get(item.url) ?? item);
  for (const [url, item] of scrapedByUrl) {
    if (!existingUrls.has(url)) merged.push(item);
  }
  return merged;
}
