import { EvaluateForm } from "@/components/scout/evaluate-form"
import { HeroBackdrop } from "@/components/scout/hero-backdrop"
import { ReportPreview } from "@/components/scout/report-preview"

export default function Page() {
  return (
    <div className="flex min-h-[100dvh] flex-col">
      <header className="mx-auto flex h-16 w-full max-w-6xl shrink-0 items-center justify-between px-4 sm:px-6">
        <span className="font-mono text-xs tracking-[0.2em] uppercase">
          Scout
        </span>
        <span className="font-mono text-[11px] text-muted-foreground">
          Every claim links to a source.
        </span>
      </header>

      <main className="relative isolate flex flex-1 items-center">
        <HeroBackdrop />
        <div className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 pb-16 sm:px-6 lg:grid-cols-[minmax(0,1fr)_26rem] lg:gap-16">
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
        </div>
      </main>
    </div>
  )
}
