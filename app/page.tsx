import { EvaluateForm } from "@/components/scout/evaluate-form"
import { ReportPreview } from "@/components/scout/report-preview"
import { SECTION_TITLES } from "@/types/scout-api"

/** The 11 report sections, grouped so the landing reads as three questions. */
const CLUSTERS = [
  {
    question: "Who are they?",
    body: "Funding, headcount, customers, and what the product actually does.",
    keys: [
      "company_overview",
      "product_overview",
      "feature_analysis",
      "engineering_health",
    ],
  },
  {
    question: "What will they cost you?",
    body: "Published plans, the costs hidden behind sales calls, and how rivals price.",
    keys: [
      "pricing_intelligence",
      "competitor_analysis",
      "community_sentiment",
    ],
  },
  {
    question: "What could go wrong?",
    body: "Compliance gaps, lock-in, and the risks that stall a procurement review.",
    keys: [
      "security_compliance",
      "risk_assessment",
      "executive_summary",
      "recommendation",
    ],
  },
] as const

export default function Page() {
  return (
    <div className="min-h-[100dvh]">
      <header className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <span className="font-mono text-xs tracking-[0.2em] uppercase">
          Scout
        </span>
        <a
          href="#report"
          className="font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          What you get
        </a>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pt-10 pb-20 sm:px-6 lg:grid-cols-[minmax(0,1fr)_26rem] lg:gap-16 lg:pt-16">
          <div className="min-w-0">
            <h1 className="max-w-xl text-4xl leading-[1.05] tracking-tight text-balance md:text-5xl lg:text-6xl">
              Should you trust this company?
            </h1>
            <p className="mt-4 max-w-md text-[15px] leading-relaxed text-muted-foreground">
              Scout reads official sources and third-party signals, then grades
              the risk and links every claim to evidence.
            </p>
            <div className="mt-8 max-w-xl">
              <EvaluateForm />
            </div>
          </div>

          <ReportPreview />
        </section>

        <section
          id="report"
          className="border-t border-border bg-muted/20 py-16 sm:py-20"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className="max-w-lg text-2xl tracking-tight text-balance sm:text-3xl">
              Eleven sections, written to answer three questions.
            </h2>
            <div className="mt-10 grid gap-10 sm:grid-cols-3 sm:gap-8">
              {CLUSTERS.map((cluster) => (
                <div key={cluster.question} className="space-y-3">
                  <h3 className="text-base font-medium">{cluster.question}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {cluster.body}
                  </p>
                  <ul className="space-y-1 border-t border-border pt-3">
                    {cluster.keys.map((key) => (
                      <li
                        key={key}
                        className="font-mono text-[11px] text-muted-foreground"
                      >
                        {SECTION_TITLES[key]}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="mx-auto flex max-w-6xl items-center justify-between px-4 py-6 sm:px-6">
        <span className="font-mono text-[11px] text-muted-foreground">
          Every claim links to a source.
        </span>
        <span className="font-mono text-[11px] text-muted-foreground">
          Scout
        </span>
      </footer>
    </div>
  )
}
