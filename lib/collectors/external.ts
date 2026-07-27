import { getExa } from "@/lib/exa";

import {
  isCompetitorEvidence,
  isEngineeringEvidence,
  isLeadershipEvidence,
  isPricingEvidence,
  isSecurityEvidence,
  LEADERSHIP_PATH,
} from "./evidence-text";
import { isOnTopicReviewResult } from "./relevance";

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
const MAX_LEADERSHIP_RESULTS = 10;
const MAX_REVIEW_RESULTS = 10;
const MAX_SECURITY_RESULTS = 4;
const MAX_COMPETITOR_RESULTS = 4;
const MAX_PRICING_RESULTS = 3;
const MAX_ENGINEERING_RESULTS = 3;

type SearchCategory =
  | "leadership"
  | "review"
  | "security"
  | "competitive"
  | "pricing"
  | "engineering"
  | "general";

type SearchSpec = {
  query: string;
  includeDomains?: string[];
  numResults?: number;
  category: SearchCategory;
};

function cleanDomain(domain: string): string {
  return domain.replace(/^www\./i, "");
}

function buildSearches(companyName: string, domain: string | null): SearchSpec[] {
  const identity = domain ? `${companyName} OR ${domain}` : companyName;
  const quoted = `"${companyName}"`;
  const bareDomain = domain ? cleanDomain(domain) : null;

  const leadership: SearchSpec[] = [
    ...(bareDomain
      ? [
          { query: `founders of ${bareDomain}`, numResults: 6, category: "leadership" as const },
          {
            query: `${quoted} founders team about`,
            includeDomains: [bareDomain],
            numResults: 4,
            category: "leadership" as const,
          },
        ]
      : []),
    { query: `founders of ${quoted}`, numResults: 6, category: "leadership" },
    { query: `${quoted} founder OR co-founder OR CEO OR "founded by"`, numResults: 6, category: "leadership" },
    {
      query: `${quoted} founders CEO key people`,
      includeDomains: ["linkedin.com"],
      numResults: 6,
      category: "leadership",
    },
    {
      query: `${quoted} founders funding`,
      includeDomains: ["crunchbase.com", "wikipedia.org"],
      numResults: 5,
      category: "leadership",
    },
    { query: `${quoted} company about founded headquarters employees funding`, numResults: 4, category: "leadership" },
  ];

  const review: SearchSpec[] = [
    {
      query: `${quoted} Glassdoor Reviews`,
      includeDomains: ["glassdoor.com"],
      numResults: 6,
      category: "review",
    },
    {
      query: `${quoted} reviews rating employees`,
      includeDomains: ["ambitionbox.com"],
      numResults: 5,
      category: "review",
    },
    {
      query: `${quoted} reviews`,
      includeDomains: ["g2.com"],
      numResults: 5,
      category: "review",
    },
    {
      query: `${quoted} reviews`,
      includeDomains: ["capterra.com"],
      numResults: 4,
      category: "review",
    },
    {
      query: `${quoted} reviews`,
      includeDomains: ["trustpilot.com"],
      numResults: 4,
      category: "review",
    },
  ];

  const security: SearchSpec[] = [
    {
      query: `${quoted} SOC 2 OR ISO 27001 OR HIPAA OR "trust center" OR security compliance`,
      numResults: 5,
      category: "security",
    },
    { query: `${quoted} security incident OR data breach`, numResults: 4, category: "security" },
    ...(bareDomain
      ? [
          {
            query: `${quoted} security compliance certifications`,
            includeDomains: [bareDomain],
            numResults: 3,
            category: "security" as const,
          },
        ]
      : []),
  ];

  const competitive: SearchSpec[] = [
    { query: `${quoted} vs alternatives competitors`, numResults: 5, category: "competitive" },
    {
      query: `${quoted} alternatives OR compare`,
      includeDomains: ["g2.com"],
      numResults: 5,
      category: "competitive",
    },
  ];

  const pricing: SearchSpec[] = [
    {
      query: `${quoted} pricing plans OR "per seat" OR "per user" OR "per month"`,
      numResults: 5,
      category: "pricing",
    },
    { query: `${quoted} pricing complaints too expensive`, numResults: 3, category: "pricing" },
    ...(bareDomain
      ? [
          {
            query: `${quoted} pricing`,
            includeDomains: [bareDomain],
            numResults: 3,
            category: "pricing" as const,
          },
        ]
      : []),
  ];

  const engineering: SearchSpec[] = [
    {
      query: `${quoted} API documentation SDK changelog`,
      numResults: 4,
      category: "engineering",
    },
    {
      query: `${quoted} status page uptime reliability`,
      numResults: 3,
      category: "engineering",
    },
  ];

  const general: SearchSpec[] = [
    { query: `${identity} reviews pros and cons`, category: "general" },
    {
      query: `${quoted}`,
      includeDomains: ["news.ycombinator.com", "reddit.com"],
      numResults: 5,
      category: "general",
    },
  ];

  return [...leadership, ...review, ...security, ...competitive, ...pricing, ...engineering, ...general];
}

function hostnameOf(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function reviewSourcePriority(domain: string | null): number {
  if (!domain) return 0;
  if (domain.includes("glassdoor.com")) return 10;
  if (domain.includes("ambitionbox.com")) return 10;
  if (domain.includes("g2.com")) return 9;
  if (domain.includes("capterra.com")) return 8;
  if (domain.includes("trustpilot.com")) return 7;
  return 1;
}

function leadershipSourcePriority(item: ExternalResult): number {
  const domain = item.domain ?? "";
  if (domain && LEADERSHIP_PATH.test(item.url)) return 12;
  if (domain.includes("linkedin.com")) return 11;
  if (domain.includes("crunchbase.com")) return 10;
  if (domain.includes("wikipedia.org")) return 9;
  if (isLeadershipEvidence(item)) return 8;
  return 5;
}

function isReviewDomain(domain: string | null): boolean {
  if (!domain) return false;
  return /(glassdoor|ambitionbox|g2|capterra|trustpilot)\./i.test(domain);
}

function isLongContentCategory(category: SearchCategory): boolean {
  return (
    category === "leadership" ||
    category === "security" ||
    category === "pricing" ||
    category === "competitive" ||
    category === "engineering"
  );
}

function classifyItem(spec: SearchSpec, item: ExternalResult): SearchCategory {
  if (spec.category === "leadership" || isLeadershipEvidence(item)) return "leadership";
  if (spec.category === "review") return "review";
  if (spec.category === "security" || isSecurityEvidence(item)) return "security";
  if (spec.category === "competitive" || isCompetitorEvidence(item)) return "competitive";
  if (spec.category === "pricing" || isPricingEvidence(item)) return "pricing";
  if (spec.category === "engineering" || isEngineeringEvidence(item)) return "engineering";
  return "general";
}

function takeSlice(items: ExternalResult[], max: number, remaining: { n: number }): ExternalResult[] {
  const count = Math.min(items.length, max, remaining.n);
  remaining.n -= count;
  return items.slice(0, count);
}

function mergeBuckets(buckets: Record<SearchCategory, ExternalResult[]>): ExternalResult[] {
  const remaining = { n: MAX_TOTAL_RESULTS };

  const leadership = [...buckets.leadership].sort(
    (a, b) => leadershipSourcePriority(b) - leadershipSourcePriority(a),
  );
  const review = [...buckets.review].sort(
    (a, b) => reviewSourcePriority(b.domain) - reviewSourcePriority(a.domain),
  );

  const out: ExternalResult[] = [
    ...takeSlice(leadership, MAX_LEADERSHIP_RESULTS, remaining),
    ...takeSlice(review, MAX_REVIEW_RESULTS, remaining),
    ...takeSlice(buckets.security, MAX_SECURITY_RESULTS, remaining),
    ...takeSlice(buckets.competitive, MAX_COMPETITOR_RESULTS, remaining),
    ...takeSlice(buckets.pricing, MAX_PRICING_RESULTS, remaining),
    ...takeSlice(buckets.engineering, MAX_ENGINEERING_RESULTS, remaining),
    ...takeSlice(buckets.general, remaining.n, remaining),
  ];

  return out.slice(0, MAX_TOTAL_RESULTS);
}

/**
 * Runs targeted Exa queries in parallel and merges/dedupes into a single
 * evidence list. Leadership, reviews, security, competitors, pricing, and
 * engineering each get reserved slots so one category cannot crowd the rest.
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
        contents: {
          text: { maxCharacters: isLongContentCategory(spec.category) ? 4000 : 2500 },
          summary: true,
        },
      }),
    ),
  );

  const seen = new Set<string>();
  const buckets: Record<SearchCategory, ExternalResult[]> = {
    leadership: [],
    review: [],
    security: [],
    competitive: [],
    pricing: [],
    engineering: [],
    general: [],
  };

  for (let i = 0; i < settled.length; i++) {
    const outcome = settled[i];
    const spec = searches[i];
    if (!spec || outcome.status !== "fulfilled") continue;

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

      if (isReviewDomain(item.domain) && !isOnTopicReviewResult(item, companyName, domain)) {
        continue;
      }

      buckets[classifyItem(spec, item)].push(item);
    }
  }

  return mergeBuckets(buckets);
}
