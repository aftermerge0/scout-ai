import { sampleEvaluation } from "@/lib/api/mocks"
import type { SectionKey } from "@/types/scout-api"

import { EvidenceChips, EvidenceProvider } from "./evidence"
import { Confidence, Label, Pill, VerdictPill } from "./primitives"
import { StatusDot } from "./section-card"

/**
 * Real report components rendered against the fixture evaluation, so the landing
 * page shows the actual product surface rather than a mocked-up screenshot.
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

export function ReportPreview() {
  const evaluation = sampleEvaluation()
  const sections = evaluation.sections.filter((section) =>
    PREVIEW_SECTIONS.includes(section.key)
  )
  const findings = evaluation.findings.slice(0, 2)

  return (
    <EvidenceProvider evidence={evaluation.evidence}>
      <div className="scout-enter min-w-0 overflow-hidden rounded-md border border-border bg-card/40">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div className="flex min-w-0 items-baseline gap-2">
            <span className="truncate text-sm font-medium">
              {evaluation.companyName}
            </span>
            <span className="truncate font-mono text-xs text-muted-foreground">
              {evaluation.domain}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="font-mono text-base tabular-nums">
              {evaluation.summary.overallScore?.toFixed(1)}
              <span className="text-[11px] text-muted-foreground">/10</span>
            </span>
            {evaluation.summary.verdict ? (
              <VerdictPill verdict={evaluation.summary.verdict} />
            ) : null}
          </div>
        </div>

        <ul className="divide-y divide-dashed divide-border">
          {sections.map((section, i) => (
            <li
              key={section.key}
              // Short stagger: enough to read as a sequence, not enough to wait on.
              style={
                { "--enter-delay": `${120 + i * 50}ms` } as React.CSSProperties
              }
              className="scout-enter flex items-center gap-2 px-4 py-2"
            >
              <StatusDot status={section.status} />
              <span className="truncate text-[13px]">{section.title}</span>
              <Confidence value={section.confidence} className="ml-auto" />
            </li>
          ))}
        </ul>

        <div className="space-y-2 border-t border-border px-4 py-3">
          {findings.map((finding, i) => (
            <div
              key={finding.id}
              style={
                { "--enter-delay": `${340 + i * 50}ms` } as React.CSSProperties
              }
              className="scout-enter flex min-w-0 items-center gap-2 whitespace-nowrap"
            >
              <Pill tone={finding.severity}>{finding.severity}</Pill>
              <span className="truncate text-[13px]">{finding.title}</span>
              <EvidenceChips
                ids={finding.evidenceIds.slice(0, 1)}
                className="ml-auto shrink-0"
              />
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between border-t border-border px-4 py-2">
          <Label>sample report</Label>
          <span className="font-mono text-[11px] text-muted-foreground">
            {evaluation.evidence.length} sources
          </span>
        </div>
      </div>
    </EvidenceProvider>
  )
}
