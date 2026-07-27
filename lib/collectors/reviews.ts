import { getFirecrawl } from "@/lib/firecrawl";

import type { ExternalResult } from "./external";
import {
  companyTokens,
  isOnTopicResult,
  mentionsCompany,
} from "./relevance";

const EMPLOYEE_REVIEW_HOSTS = ["glassdoor.com", "ambitionbox.com"] as const;
const CUSTOMER_REVIEW_HOSTS = ["g2.com", "capterra.com", "trustpilot.com"] as const;
const REVIEW_HOSTS = [...EMPLOYEE_REVIEW_HOSTS, ...CUSTOMER_REVIEW_HOSTS] as const;

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

function companySlug(companyName: string): string {
  return companyName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Seed high-value review URLs we can scrape directly:
 * - AmbitionBox / G2 work from a company slug
 * - Glassdoor Reviews need a company id (E#####) extracted from any on-topic
 *   Glassdoor hit (salary/DEI/interview pages still carry the id)
 *
 * Glassdoor + AmbitionBox = employee reviews.
 * G2 / Capterra / Trustpilot = customer/product reviews.
 */
export function expandCanonicalReviewUrls(
  external: ExternalResult[],
  companyName: string,
  domain: string | null,
): string[] {
  const urls = new Set<string>();
  const slug = companySlug(companyName);
  const tokens = companyTokens(companyName, domain);
  const nameSlug = companyName.replace(/\s+/g, "-");

  // Always try slug-based employee + customer review pages.
  if (slug.length >= 2) {
    urls.add(`https://www.ambitionbox.com/reviews/${slug}-reviews`);
    urls.add(`https://www.ambitionbox.com/overview/${slug}-overview`);
    urls.add(`https://www.g2.com/products/${slug}/reviews`);
    urls.add(`https://www.g2.com/sellers/${slug}`);
  }

  let glassdoorId: string | null = null;

  for (const item of external) {
    if (!isReviewHost(item.url)) continue;
    if (!isOnTopicResult(item, companyName, domain)) continue;

    const host = hostnameOf(item.url) ?? "";

    if (host.includes("glassdoor.com")) {
      const idMatch = item.url.match(/E(\d{4,})/i);
      if (idMatch) glassdoorId = idMatch[1]!;
    }

    if (host.includes("ambitionbox.com")) {
      if (/\/reviews\//i.test(item.url) && mentionsCompany(item.url, tokens)) {
        urls.add(item.url.split("?")[0]!);
      }
      const overview = item.url.match(/\/overview\/([a-z0-9-]+)-overview/i);
      if (overview && mentionsCompany(overview[1]!, tokens)) {
        urls.add(`https://www.ambitionbox.com/reviews/${overview[1]}-reviews`);
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
      mentionsCompany(`${item.url} ${item.title ?? ""}`, tokens)
    ) {
      urls.add(item.url.split("?")[0]!);
    }
  }

  if (glassdoorId) {
    urls.add(`https://www.glassdoor.com/Reviews/${nameSlug}-Reviews-E${glassdoorId}.htm`);
    urls.add(
      `https://www.glassdoor.com/Overview/Working-at-${nameSlug}-EI_IE${glassdoorId}.htm`,
    );
  }

  return Array.from(urls).slice(0, MAX_REVIEW_PAGES);
}

/**
 * Deep-scrapes employee + customer review pages so agents get ratings/quotes.
 * Seeds AmbitionBox/G2 by slug and Glassdoor Reviews once a company id is known.
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
    ...canonical,
    ...filtered.filter((r) => isReviewHost(r.url)).map((r) => r.url),
  ]
    .filter((url, i, arr) => arr.indexOf(url) === i)
    .slice(0, MAX_REVIEW_PAGES);

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
          `${url} ${doc.metadata?.title ?? ""} ${markdown.slice(0, 500)}`,
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
