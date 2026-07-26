import { EvaluateForm } from "@/components/scout/evaluate-form"
import { Label } from "@/components/scout/primitives"

const PIPELINE = [
  "resolve entity",
  "collect official",
  "collect third-party",
  "analyze",
  "recommend",
]

export default function Page() {
  return (
    <div className="mx-auto flex min-h-svh max-w-3xl flex-col px-4 sm:px-6">
      <header className="flex items-center justify-between py-6">
        <span className="font-mono text-xs tracking-[0.2em] uppercase">
          Scout
        </span>
        <Label>due diligence engine</Label>
      </header>

      <main className="flex flex-1 flex-col justify-center py-12">
        <h1 className="max-w-2xl text-3xl leading-tight tracking-tight text-balance sm:text-4xl">
          Should you trust this company?
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
          Scout runs analyst-grade diligence across official sources,
          third-party signals, and market data — then grades the risk instead of
          summarizing the internet.
        </p>

        <div className="mt-8">
          <EvaluateForm />
        </div>

        <ol className="mt-10 flex flex-wrap items-center gap-x-2 gap-y-2">
          {PIPELINE.map((step, i) => (
            <li key={step} className="flex items-center gap-2">
              <span className="font-mono text-[11px] text-muted-foreground">
                {String(i + 1).padStart(2, "0")} {step}
              </span>
              {i < PIPELINE.length - 1 ? (
                <span aria-hidden className="text-muted-foreground/40">
                  →
                </span>
              ) : null}
            </li>
          ))}
        </ol>
      </main>

      <footer className="flex items-center justify-between border-t border-border py-4">
        <Label>11 sections · evidence-linked</Label>
        <Label>v1</Label>
      </footer>
    </div>
  )
}
