import { getFirecrawl } from "@/lib/firecrawl";

import type { ExternalResult } from "./external";
import {
  companyTokens,
  isOnTopicReviewResult,
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
const SCRAPE_TIMEOUT_MS = 30_000;

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
 * Seed high-value review URLs we can scrape directly.
 * Glassdoor + AmbitionBox = employee reviews.
 * G2 / Capterra / Trustpilot = customer/product reviews.
 */
export function expandCanonicalReviewUrls(
  external: ExternalResult[],
  companyName: string,
  domain: string | null,
): string[] {
  const urls: string[] = [];
  const seen = new Set<string>();
  const add = (url: string) => {
    if (seen.has(url)) return;
    seen.add(url);
    urls.push(url);
  };

  const slug = companySlug(companyName);
  const nameSlug = companyName.replace(/\s+/g, "-");
  const tokens = companyTokens(companyName, domain);

  // Employee reviews first (priority for Firecrawl budget).
  const onTopicGlassdoor = external.filter(
    (item) =>
      (hostnameOf(item.url) ?? "").includes("glassdoor.com") &&
      isOnTopicReviewResult(item, companyName, domain),
  );
  let glassdoorId: string | null = null;
  for (const item of onTopicGlassdoor) {
    const idMatch = item.url.match(/E(\d{4,})/i);
    if (idMatch) {
      glassdoorId = idMatch[1]!;
      break;
    }
  }

  if (glassdoorId) {
    add(`https://www.glassdoor.com/Reviews/${nameSlug}-Reviews-E${glassdoorId}.htm`);
    add(
      `https://www.glassdoor.com/Overview/Working-at-${nameSlug}-EI_IE${glassdoorId}.htm`,
    );
  }

  if (slug.length >= 2) {
    add(`https://www.ambitionbox.com/reviews/${slug}-reviews`);
    add(`https://www.ambitionbox.com/overview/${slug}-overview`);
  }

  // Customer reviews next.
  if (slug.length >= 2) {
    add(`https://www.g2.com/products/${slug}/reviews`);
    add(`https://www.g2.com/sellers/${slug}`);
  }

  for (const item of external) {
    if (!isReviewHost(item.url)) continue;
    if (!isOnTopicReviewResult(item, companyName, domain)) continue;
    const host = hostnameOf(item.url) ?? "";
    // Prefer English product pages; skip localized G2 paths (/it/, /de/, …).
    if (/g2\.com\/[a-z]{2}\//i.test(item.url)) continue;

    if (host.includes("ambitionbox.com") && /\/reviews\//i.test(item.url)) {
      add(item.url.split("?")[0]!);
    }
    if (host.includes("g2.com") && (/\/products\//i.test(item.url) || /\/sellers\//i.test(item.url))) {
      add(item.url.split("?")[0]!);
    }
    if (
      host.includes("capterra.com") &&
      /\/reviews/i.test(item.url) &&
      mentionsCompany(`${item.url} ${item.title ?? ""}`, tokens)
    ) {
      add(item.url.split("?")[0]!);
    }
  }

  return urls.slice(0, MAX_REVIEW_PAGES);
}

/**
 * Deep-scrapes employee + customer review pages so agents get ratings/quotes.
 * Always tries AmbitionBox/G2 by slug; Glassdoor Reviews once a company id is known.
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
      (r) => isOnTopicReviewResult(r, companyName, domain) || !isReviewHost(r.url),
    );
  }

  const filtered = external.filter((r) => {
    if (!isReviewHost(r.url)) return true;
    return isOnTopicReviewResult(r, companyName, domain);
  });

  const canonical = expandCanonicalReviewUrls(filtered, companyName, domain);
  const existingUrls = new Set(filtered.map((r) => r.url));
  const toScrape = canonical.slice(0, MAX_REVIEW_PAGES);

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
          `${url} ${doc.metadata?.title ?? ""} ${markdown.slice(0, 800)}`,
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

  // Prefer scraped review pages; drop DEI/salary/interview side pages when
  // we successfully scraped the real Reviews URL for the same Glassdoor id.
  const scrapedGlassdoorReviewIds = new Set<string>();
  for (const url of scrapedByUrl.keys()) {
    if (/glassdoor\.com\/Reviews\//i.test(url)) {
      const id = url.match(/E(\d{4,})/i)?.[1];
      if (id) scrapedGlassdoorReviewIds.add(id);
    }
  }

  const merged = filtered
    .filter((item) => {
      const host = hostnameOf(item.url) ?? "";
      if (!host.includes("glassdoor.com")) return true;
      const id = item.url.match(/E(\d{4,})/i)?.[1];
      if (id && scrapedGlassdoorReviewIds.has(id) && !/\/Reviews\//i.test(item.url)) {
        return false;
      }
      return true;
    })
    .map((item) => scrapedByUrl.get(item.url) ?? item);

  for (const [url, item] of scrapedByUrl) {
    if (!existingUrls.has(url)) merged.unshift(item);
  }
  return merged;
}
