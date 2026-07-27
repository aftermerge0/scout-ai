import type { EvidenceItem, Finding, SectionDataByKey, SectionKey } from "@/lib/api-types";

type ContentInput = {
  companyName: string;
  domain: string | null;
  normalizedUrl: string | null;
  createdAt: number;
};

export type GeneratedContent = {
  sections: SectionDataByKey;
  /** Section-level confidence shown alongside (not inside) each section's `data`. */
  sectionConfidence: Record<SectionKey, number>;
  findings: Finding[];
  evidence: EvidenceItem[];
};

const SECTION_CONFIDENCE: Record<SectionKey, number> = {
  executive_summary: 84,
  company_overview: 82,
  product_overview: 78,
  feature_analysis: 55,
  community_sentiment: 74,
  security_compliance: 50,
  pricing_intelligence: 45,
  competitor_analysis: 38,
  engineering_health: 58,
  risk_assessment: 60,
  recommendation: 65,
};

/**
 * Deterministically generates a full, contract-shaped report for a company.
 *
 * This is a Phase 0 stand-in for the real pipeline (entity resolution ->
 * Firecrawl -> Exa -> Azure OpenAI agents). It exists so the frontend can be
 * built and tested against the exact response shapes today. Swapping this
 * for real per-section agents later requires no API changes.
 */
export function generateEvaluationContent(input: ContentInput): GeneratedContent {
  const { companyName, domain, normalizedUrl, createdAt } = input;
  const site = domain ?? "the company's website";
  const homeUrl = normalizedUrl ?? (domain ? `https://${domain}` : "https://example.com");
  const fetchedAt = (offsetMs: number) => new Date(createdAt + offsetMs).toISOString();

  const evidence: EvidenceItem[] = [
    {
      id: "e-home",
      sourceType: "official",
      url: homeUrl,
      title: companyName,
      domain,
      snippet: `${companyName} homepage and positioning.`,
      fetchedAt: fetchedAt(2500),
    },
    {
      id: "e-docs",
      sourceType: "official",
      url: `${homeUrl}/docs`,
      title: "Docs",
      domain,
      snippet: "Product and API documentation.",
      fetchedAt: fetchedAt(3200),
    },
    {
      id: "e-security",
      sourceType: "official",
      url: `${homeUrl}/security`,
      title: "Security",
      domain,
      snippet: "Security and compliance overview page.",
      fetchedAt: fetchedAt(3600),
    },
    {
      id: "e-pricing",
      sourceType: "official",
      url: `${homeUrl}/pricing`,
      title: "Pricing",
      domain,
      snippet: "Published plans and seat pricing.",
      fetchedAt: fetchedAt(4000),
    },
    {
      id: "e-hn",
      sourceType: "external",
      url: "https://news.ycombinator.com/item?id=example",
      title: `Discussion: ${companyName}`,
      domain: "news.ycombinator.com",
      snippet: "Community discussion praising speed and UX.",
      fetchedAt: fetchedAt(11000),
    },
    {
      id: "e-reddit",
      sourceType: "external",
      url: "https://reddit.com/r/saas/comments/example",
      title: `${companyName} experiences`,
      domain: "reddit.com",
      snippet: "Mixed feedback on pricing and migration effort.",
      fetchedAt: fetchedAt(12000),
    },
    {
      id: "e-compare",
      sourceType: "external",
      url: `https://www.g2.com/compare/${(domain ?? companyName).toLowerCase().replace(/[^a-z0-9]+/g, "-")}-alternatives`,
      title: "Comparison article",
      domain: "g2.com",
      snippet: "Feature comparison against category alternatives.",
      fetchedAt: fetchedAt(13000),
    },
    {
      id: "e-glassdoor",
      sourceType: "external",
      url: `https://www.glassdoor.com/Reviews/${(companyName).replace(/\s+/g, "-")}-Reviews-E.htm`,
      title: `${companyName} Glassdoor reviews`,
      domain: "glassdoor.com",
      snippet: "Employee reviews covering culture, pay, and management.",
      fetchedAt: fetchedAt(14000),
    },
    {
      id: "e-ambition",
      sourceType: "external",
      url: `https://www.ambitionbox.com/reviews/${(companyName).toLowerCase().replace(/\s+/g, "-")}-reviews`,
      title: `${companyName} AmbitionBox reviews`,
      domain: "ambitionbox.com",
      snippet: "Employee ratings and work-life balance feedback.",
      fetchedAt: fetchedAt(14500),
    },
    {
      id: "e-about",
      sourceType: "official",
      url: `${homeUrl}/about`,
      title: "About",
      domain,
      snippet: "Company about page with founding and leadership context.",
      fetchedAt: fetchedAt(2800),
    },
  ];

  const evidenceIds = {
    home: ["e-home"],
    docs: ["e-docs"],
    security: ["e-security"],
    pricing: ["e-pricing"],
    hn: ["e-hn"],
    reddit: ["e-reddit"],
    compare: ["e-compare"],
    glassdoor: ["e-glassdoor"],
    ambition: ["e-ambition"],
    about: ["e-about"],
  };

  const isVercel = (domain ?? "").includes("vercel") || /vercel/i.test(companyName);
  const companyFacts = isVercel
    ? {
        founded: "2015",
        hq: "San Francisco, USA",
        employees: "700-800",
        funding: "$863M total funding",
        investors: ["Accel", "CRV", "GV", "Bedrock", "GIC"],
        estimatedArr: "$150M–$200M (estimated)",
        customers: ["OpenAI", "Nike", "Under Armour", "HashiCorp"],
        regions: ["Global"],
        recentGrowth: "Continued expansion of AI Cloud / v0 and enterprise platform adoption.",
        founders: [
          {
            name: "Guillermo Rauch",
            role: "Founder & CEO",
            background: "Creator of Next.js and Socket.IO; founded Vercel (originally ZEIT) in 2015.",
            evidenceIds: evidenceIds.about,
          },
        ],
      }
    : {
        founded: null as string | null,
        hq: null as string | null,
        employees: null as string | null,
        funding: null as string | null,
        investors: [] as string[],
        estimatedArr: null as string | null,
        customers: [] as string[],
        regions: ["Global"],
        recentGrowth: "Public signals suggest continued product investment.",
        founders: [] as Array<{
          name: string;
          role: string | null;
          background: string | null;
          evidenceIds: string[];
        }>,
      };

  const sections: SectionDataByKey = {
    executive_summary: {
      overallScore: 8.2,
      verdict: "yes",
      confidence: 84,
      headline: `${companyName} looks like a solid fit for product-led teams evaluating this category.`,
      bestSuitedFor: ["Startups", "Product teams", "Engineering teams under 200"],
      avoidIf: ["Heavy regulated enterprise compliance requirements"],
      highlights: [
        "Clear product positioning and differentiated UX",
        "Active community with mostly positive sentiment",
        "Some enterprise governance gaps worth diligence before signing",
      ],
      claims: [
        { id: "c-exec-1", text: `${companyName} positions itself clearly for its target segment.`, confidence: 90, evidenceIds: evidenceIds.home },
      ],
    },
    company_overview: {
      ...companyFacts,
      claims: isVercel
        ? [
            {
              id: "c-co-1",
              text: "Vercel was founded in 2015 (originally ZEIT) by Guillermo Rauch.",
              confidence: 88,
              evidenceIds: evidenceIds.about,
            },
          ]
        : [
            {
              id: "c-co-1",
              text: "Company-level facts (founded, HQ, funding, founders) require external enrichment.",
              confidence: 30,
              evidenceIds: [],
            },
          ],
    },
    product_overview: {
      whatTheySell: `A product in the space described on ${site}.`,
      primaryCustomers: ["Teams evaluating this category of tool"],
      useCases: ["Core workflow described on the homepage"],
      differentiators: ["Positioning and UX emphasized on marketing pages"],
      coreProducts: [{ name: companyName, description: "Primary product surfaced on the homepage." }],
      claims: [
        { id: "c-po-1", text: `${companyName}'s homepage describes its primary use case.`, confidence: 82, evidenceIds: evidenceIds.home },
      ],
    },
    feature_analysis: {
      features: [
        { name: "API", present: "yes", quality: "good", notes: null, evidenceIds: evidenceIds.docs },
        { name: "SSO", present: "unknown", quality: "unknown", notes: "Not confirmed from public pages", evidenceIds: evidenceIds.security },
        { name: "Webhooks", present: "unknown", quality: "unknown", notes: null, evidenceIds: evidenceIds.docs },
        { name: "RBAC", present: "unknown", quality: "unknown", notes: null, evidenceIds: [] },
      ],
      claims: [],
    },
    community_sentiment: {
      overall: isVercel ? "positive" : "mixed",
      trend: "stable",
      positiveThemes: isVercel
        ? [
            {
              theme: "Developer experience",
              examples: ["Praised for Next.js integration and preview deployments"],
              evidenceIds: evidenceIds.hn,
            },
            {
              theme: "Deploy speed",
              examples: ["Teams highlight fast global deploys and edge network"],
              evidenceIds: evidenceIds.compare,
            },
          ]
        : [
            {
              theme: "Good user experience",
              examples: ["Praised in community discussion"],
              evidenceIds: evidenceIds.hn,
            },
          ],
      negativeThemes: isVercel
        ? [
            {
              theme: "Pricing at scale",
              examples: ["Usage-based bills surprise teams after traffic spikes"],
              evidenceIds: evidenceIds.reddit,
            },
          ]
        : [
            {
              theme: "Pricing and migration friction",
              examples: ["Mentioned in community feedback"],
              evidenceIds: evidenceIds.reddit,
            },
          ],
      reviews: [
        {
          source: "glassdoor",
          sourceLabel: "Glassdoor",
          rating: isVercel ? "4.2/5" : null,
          reviewCount: isVercel ? "200+" : null,
          summary: isVercel
            ? "Employees rate culture and mission highly; pace and on-call load are common caveats."
            : "Employee review summary pending live collection.",
          pros: isVercel
            ? ["Strong engineering culture", "High-caliber peers", "Mission-driven product"]
            : ["Culture"],
          cons: isVercel
            ? ["Fast pace / burnout risk", "Compensation varies by level"]
            : ["Workload"],
          sampleQuotes: isVercel
            ? [
                "Best engineering org I've worked in — shipping velocity is unmatched.",
                "Exciting product, but the on-call and pace can be intense.",
              ]
            : [],
          url: evidence.find((e) => e.id === "e-glassdoor")?.url ?? null,
          evidenceIds: evidenceIds.glassdoor,
        },
        {
          source: "ambitionbox",
          sourceLabel: "AmbitionBox",
          rating: isVercel ? "4.0/5" : null,
          reviewCount: isVercel ? "50+" : null,
          summary: isVercel
            ? "Work-life balance scores are mixed; learning opportunities score higher."
            : null,
          pros: isVercel ? ["Learning", "Brand"] : [],
          cons: isVercel ? ["Work-life balance"] : [],
          sampleQuotes: [],
          url: evidence.find((e) => e.id === "e-ambition")?.url ?? null,
          evidenceIds: evidenceIds.ambition,
        },
        {
          source: "g2",
          sourceLabel: "G2",
          rating: isVercel ? "4.6/5" : null,
          reviewCount: isVercel ? "100+" : null,
          summary: isVercel
            ? "Customers love DX and previews; pricing transparency is the main knock."
            : "Customer review summary pending live collection.",
          pros: isVercel ? ["Preview deployments", "Next.js integration", "Performance"] : [],
          cons: isVercel ? ["Pricing complexity", "Vendor lock-in concerns"] : [],
          sampleQuotes: isVercel
            ? ["Preview URLs changed how we review PRs — indispensable."]
            : [],
          url: evidence.find((e) => e.id === "e-compare")?.url ?? null,
          evidenceIds: evidenceIds.compare,
        },
      ],
      claims: [],
    },
    security_compliance: {
      enterpriseReadiness: 55,
      certifications: [{ name: "SOC2", status: "unknown", evidenceIds: evidenceIds.security }],
      controls: [{ name: "SSO", status: "unknown", notes: "Could not confirm from public pages alone", evidenceIds: evidenceIds.security }],
      concerns: ["Public security page does not clearly confirm certification status"],
      incidents: [],
      claims: [
        { id: "c-sec-1", text: "Security posture requires direct vendor confirmation for procurement.", confidence: 45, evidenceIds: evidenceIds.security },
      ],
    },
    pricing_intelligence: {
      model: "unknown",
      freeTier: null,
      plans: [],
      hiddenCosts: [],
      estimatedAnnualSpend: null,
      competitorComparison: [],
      claims: [
        { id: "c-price-1", text: "Pricing page was referenced but structured plan extraction is pending real collection.", confidence: 40, evidenceIds: evidenceIds.pricing },
      ],
    },
    competitor_analysis: {
      competitors: [],
      featureMatrix: [],
      claims: [
        { id: "c-comp-1", text: "Competitor detection is pending the real Exa collection step.", confidence: 35, evidenceIds: evidenceIds.compare },
      ],
    },
    engineering_health: {
      documentationQuality: "average",
      apiQuality: "average",
      sdkMaturity: "unknown",
      releaseCadence: null,
      statusPage: { present: false, url: null },
      openSourceSignals: null,
      deprecationPolicy: null,
      notes: ["Docs page was found; deeper API/SDK signal requires the real collection pipeline."],
      claims: [],
    },
    risk_assessment: {
      categories: [
        { category: "product", level: "unknown", rationale: "Insufficient evidence collected yet.", evidenceIds: [] },
        { category: "vendor_lock_in", level: "unknown", rationale: "Insufficient evidence collected yet.", evidenceIds: [] },
        { category: "security", level: "medium", rationale: "Certification status could not be confirmed publicly.", evidenceIds: evidenceIds.security },
        { category: "scalability", level: "unknown", rationale: "Insufficient evidence collected yet.", evidenceIds: [] },
        { category: "pricing", level: "medium", rationale: "Pricing structure not fully confirmed.", evidenceIds: evidenceIds.pricing },
        { category: "compliance", level: "medium", rationale: "No public compliance artifact found.", evidenceIds: evidenceIds.security },
        { category: "company_stability", level: "unknown", rationale: "Insufficient evidence collected yet.", evidenceIds: [] },
      ],
      topRisks: [
        {
          title: "Compliance artifacts not publicly confirmed",
          severity: "medium",
          summary: `${companyName}'s public security page does not clearly confirm certification status.`,
          evidenceIds: evidenceIds.security,
        },
        {
          title: "Pricing structure unclear from public pages",
          severity: "medium",
          summary: "Seat/usage pricing could not be fully extracted from the pricing page alone.",
          evidenceIds: evidenceIds.pricing,
        },
        {
          title: "Community feedback flags migration friction",
          severity: "medium",
          summary: "External discussion mentions friction adopting or migrating to this product.",
          evidenceIds: evidenceIds.reddit,
        },
      ],
      claims: [],
    },
    recommendation: {
      adopt: "conditional",
      confidence: 65,
      why: [
        "Clear product positioning for its target segment",
        "Community sentiment is mixed-to-positive",
      ],
      caveats: [
        "Compliance and pricing details need direct vendor confirmation",
        "This report used demo/stub content; enable the real pipeline for production-grade evidence",
      ],
      bestSuitedFor: ["Teams whose use case matches the homepage's core workflow"],
      avoidIf: ["Buyers requiring pre-confirmed compliance certifications"],
      overallScore: 8.2,
      claims: [],
    },
  };

  const findings: Finding[] = [
    {
      id: "f-security",
      category: "compliance",
      severity: "medium",
      title: "Compliance status not publicly confirmed",
      summary: `${companyName}'s security page does not clearly confirm certification status.`,
      confidence: 45,
      evidenceIds: evidenceIds.security,
      sectionKey: "security_compliance",
    },
    {
      id: "f-pricing",
      category: "pricing",
      severity: "medium",
      title: "Pricing structure unclear",
      summary: "Seat/usage pricing could not be fully extracted from public pages.",
      confidence: 40,
      evidenceIds: evidenceIds.pricing,
      sectionKey: "pricing_intelligence",
    },
    {
      id: "f-community",
      category: "product",
      severity: "medium",
      title: "Migration friction reported by users",
      summary: "External community discussion mentions friction switching to or from this product.",
      confidence: 50,
      evidenceIds: evidenceIds.reddit,
      sectionKey: "risk_assessment",
    },
  ];

  return { sections, sectionConfidence: SECTION_CONFIDENCE, findings, evidence };
}
