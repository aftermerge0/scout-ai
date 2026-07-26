import { sampleEvaluation } from "@/lib/api/mocks"
import { cn } from "@/lib/utils"
import type { RecommendationVerdict, SectionKey } from "@/types/scout-api"

import { Dither } from "./dither"
import { EvidenceChips, EvidenceProvider } from "./evidence"

/**
 * The hero's report specimen: a technical readout rather than a dashboard card.
 * Crop-mark frame, stamped verdict, leader-dot rows, segmented confidence.
 *
 * Data is the real fixture evaluation and the evidence chips are the real
 * component, so this stays honest about what a report looks like.
 *
 * Entry is CSS rather than Motion: it is predetermined, so it belongs off the
 * main thread where a busy first paint cannot drop its frames.
 */
const PREVIEW_SECTIONS: SectionKey[] = [
  "company_overview",
  "security_compliance",
  "pricing_intelligence",
  "risk_assessment",
]

const VERDICT_STAMP: Record<RecommendationVerdict, string> = {
  yes: "adopt",
  conditional: "adopt w/ conditions",
  no: "do not adopt",
}

const VERDICT_INK: Record<RecommendationVerdict, string> = {
  yes: "border-emerald-500/50 text-emerald-600 dark:text-emerald-400",
  conditional: "border-amber-500/50 text-amber-600 dark:text-amber-400",
  no: "border-red-500/50 text-red-600 dark:text-red-400",
}

/** Confidence as five cells rather than a number: reads as an instrument. */
function ConfidenceCells({ value }: { value: number | null }) {
  if (value === null) return <span className="w-16" />
  const filled = Math.round((value / 100) * 5)
  return (
    <span className="flex shrink-0 items-center gap-2">
      <span aria-hidden className="flex gap-[3px]">
        {Array.from({ length: 5 }, (_, i) => (
          <span
            key={i}
            className={cn(
              "h-2.5 w-[3px]",
              i < filled ? "bg-foreground/70" : "bg-foreground/15"
            )}
          />
        ))}
      </span>
      <span className="w-6 text-right font-mono text-[11px] text-muted-foreground tabular-nums">
        {value}
      </span>
    </span>
  )
}

/** Registration marks, as on a printed proof. */
function CropMarks() {
  const arm = "absolute size-2.5 border-foreground/25"
  return (
    <span aria-hidden className="text-foreground">
      <span className={cn(arm, "-top-px -left-px border-t border-l")} />
      <span className={cn(arm, "-top-px -right-px border-t border-r")} />
      <span className={cn(arm, "-bottom-px -left-px border-b border-l")} />
      <span className={cn(arm, "-right-px -bottom-px border-r border-b")} />
    </span>
  )
}

export function ReportPreview() {
  const evaluation = sampleEvaluation()
  const sections = evaluation.sections.filter((section) =>
    PREVIEW_SECTIONS.includes(section.key)
  )
  const findings = evaluation.findings.slice(0, 2)
  const { verdict, overallScore } = evaluation.summary

  return (
    <EvidenceProvider evidence={evaluation.evidence}>
      <figure className="scout-enter relative min-w-0">
        <figcaption className="mb-3 flex items-baseline justify-between font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
          <span>Specimen report</span>
          <span>{evaluation.evidence.length} sources</span>
        </figcaption>

        <div className="relative overflow-hidden border border-border/70 px-5 py-5">
          <CropMarks />
          {/* Dither ramp along the bottom edge: print texture, not a gradient. */}
          <Dither className="inset-x-0 bottom-0 h-28 opacity-[0.08] dark:opacity-[0.13]" />

          {/* Verdict block: score carries the weight, stamp carries the call. */}
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-baseline gap-2 truncate">
                <span className="text-sm font-medium">
                  {evaluation.companyName}
                </span>
                <span className="font-mono text-[11px] text-muted-foreground">
                  {evaluation.domain}
                </span>
              </div>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="font-mono text-5xl leading-none tracking-tighter tabular-nums">
                  {overallScore?.toFixed(1)}
                </span>
                <span className="font-mono text-sm text-muted-foreground">
                  /10
                </span>
              </div>
            </div>

            {verdict ? (
              <span
                className={cn(
                  "mt-1 shrink-0 -rotate-2 border px-2.5 py-1 font-mono text-[10px] tracking-[0.18em] uppercase",
                  VERDICT_INK[verdict]
                )}
              >
                {VERDICT_STAMP[verdict]}
              </span>
            ) : null}
          </div>

          {/* Leader-dot index: the eye tracks name to score across the rule. */}
          <ul className="mt-6 space-y-2.5">
            {sections.map((section, i) => (
              <li
                key={section.key}
                style={
                  {
                    "--enter-delay": `${120 + i * 50}ms`,
                  } as React.CSSProperties
                }
                className="scout-enter flex items-baseline gap-2"
              >
                <span className="shrink-0 truncate text-[13px]">
                  {section.title}
                </span>
                <span
                  aria-hidden
                  className="min-w-4 flex-1 translate-y-[-3px] border-b border-dotted border-border"
                />
                <ConfidenceCells value={section.confidence} />
              </li>
            ))}
          </ul>

          <div className="mt-6 space-y-3 border-t border-border/70 pt-4">
            {findings.map((finding, i) => (
              <div
                key={finding.id}
                style={
                  {
                    "--enter-delay": `${340 + i * 50}ms`,
                  } as React.CSSProperties
                }
                className="scout-enter flex min-w-0 gap-3"
              >
                <span
                  aria-hidden
                  className={cn(
                    "mt-0.5 w-0.5 shrink-0 self-stretch",
                    finding.severity === "high" && "bg-red-500/70",
                    finding.severity === "medium" && "bg-amber-500/70",
                    finding.severity === "low" && "bg-emerald-500/60"
                  )}
                />
                <div className="min-w-0 space-y-1">
                  <p className="flex items-baseline gap-2 truncate text-[13px]">
                    <span className="truncate">{finding.title}</span>
                    {/* Ledger annotation, not a badge: the bar already carries tone. */}
                    <span className="shrink-0 font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
                      {finding.severity}
                    </span>
                  </p>
                  <EvidenceChips ids={finding.evidenceIds.slice(0, 2)} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </figure>
    </EvidenceProvider>
  )
}
