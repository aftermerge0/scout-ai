"use client"

import { createContext, useContext, useMemo } from "react"
import { ExternalLinkIcon } from "lucide-react"

import {
  InlineCitationCard,
  InlineCitationCardBody,
  InlineCitationSource,
  InlineCitationQuote,
} from "@/components/ai-elements/inline-citation"
import { HoverCardTrigger } from "@/components/ui/hover-card"
import { cn } from "@/lib/utils"
import type { Claim, Evidence } from "@/types/scout-api"

import { Confidence, Label } from "./primitives"

const EvidenceContext = createContext<Map<string, Evidence>>(new Map())

export function EvidenceProvider({
  evidence,
  children,
}: {
  evidence: Evidence[]
  children: React.ReactNode
}) {
  const map = useMemo(
    () => new Map(evidence.map((item) => [item.id, item])),
    [evidence]
  )
  return (
    <EvidenceContext.Provider value={map}>{children}</EvidenceContext.Provider>
  )
}

export function useEvidence(ids: string[]): Evidence[] {
  const map = useContext(EvidenceContext)
  // Contract §9.2: ids missing from the poll payload are dropped, never faked.
  return ids.map((id) => map.get(id)).filter((item): item is Evidence => !!item)
}

/** Hover chip for one source. Colour encodes official vs third-party (§9.4). */
export function EvidenceChip({ evidence }: { evidence: Evidence }) {
  const official = evidence.sourceType === "official"
  return (
    <InlineCitationCard>
      <HoverCardTrigger
        render={
          <a
            href={evidence.url}
            target="_blank"
            rel="noreferrer"
            className={cn(
              "inline-flex max-w-52 items-center gap-1 rounded-sm border px-1.5 py-0.5 font-mono text-[11px] transition-colors",
              official
                ? "border-sky-500/30 bg-sky-500/10 text-sky-700 hover:bg-sky-500/20 dark:text-sky-300"
                : "border-border bg-muted/50 text-muted-foreground hover:bg-muted"
            )}
          />
        }
      >
        <span className="truncate">{evidence.domain}</span>
        <ExternalLinkIcon className="size-3 shrink-0 opacity-60" />
      </HoverCardTrigger>
      <InlineCitationCardBody>
        <div className="space-y-2 p-3">
          <div className="flex items-center justify-between gap-2">
            <Label>{official ? "Official" : "Third-party"}</Label>
            <span className="font-mono text-[10px] text-muted-foreground">
              {new Date(evidence.fetchedAt).toLocaleDateString()}
            </span>
          </div>
          <InlineCitationSource title={evidence.title} url={evidence.url} />
          {evidence.snippet ? (
            <InlineCitationQuote>{evidence.snippet}</InlineCitationQuote>
          ) : null}
        </div>
      </InlineCitationCardBody>
    </InlineCitationCard>
  )
}

export function EvidenceChips({
  ids,
  className,
}: {
  ids: string[]
  className?: string
}) {
  const evidence = useEvidence(ids)
  if (evidence.length === 0) return null
  return (
    <span className={cn("inline-flex flex-wrap gap-1", className)}>
      {evidence.map((item) => (
        <EvidenceChip key={item.id} evidence={item} />
      ))}
    </span>
  )
}

/** Provenance footer rendered under any section that ships claims. */
export function Claims({ claims }: { claims: Claim[] }) {
  if (claims.length === 0) return null
  return (
    <div className="mt-4 space-y-2 border-t border-dashed border-border pt-3">
      <Label>Provenance</Label>
      {claims.map((claim) => (
        <div key={claim.id} className="flex flex-wrap items-baseline gap-2">
          <span className="text-sm text-muted-foreground">{claim.text}</span>
          <Confidence value={claim.confidence} />
          <EvidenceChips ids={claim.evidenceIds} />
        </div>
      ))}
    </div>
  )
}
