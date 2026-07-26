"use client"

import { SECTION_TITLES, type Finding } from "@/types/scout-api"

import { EvidenceChips } from "./evidence"
import { Confidence, Label, Pill } from "./primitives"

const SEVERITY_ORDER = { high: 0, medium: 1, low: 2 } as const

/** Cross-section findings feed, most severe first. */
export function Findings({ findings }: { findings: Finding[] }) {
  if (findings.length === 0) return null

  const sorted = [...findings].sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
  )

  return (
    <div className="rounded-md border border-border">
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <Label>Findings</Label>
        <span className="font-mono text-xs text-muted-foreground tabular-nums">
          {findings.length}
        </span>
      </div>
      <ul className="divide-y divide-dashed divide-border">
        {sorted.map((finding) => (
          <li key={finding.id} className="space-y-1.5 px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <Pill tone={finding.severity}>{finding.severity}</Pill>
              <span className="text-sm font-medium">{finding.title}</span>
              <Confidence value={finding.confidence} />
            </div>
            <p className="text-sm text-muted-foreground">{finding.summary}</p>
            <div className="flex flex-wrap items-center gap-2">
              <a
                href={`#${finding.sectionKey}`}
                className="font-mono text-[11px] text-muted-foreground underline underline-offset-4 hover:text-foreground"
              >
                {SECTION_TITLES[finding.sectionKey]} ↓
              </a>
              <EvidenceChips ids={finding.evidenceIds} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
