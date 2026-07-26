"use client"

import { AlertTriangleIcon } from "lucide-react"

import { Shimmer } from "@/components/ai-elements/shimmer"
import { cn } from "@/lib/utils"
import type { AnySection, SectionStatus } from "@/types/scout-api"

import { Confidence, Label } from "./primitives"
import { SectionBody } from "./sections"

const STATUS_DOT: Record<SectionStatus, string> = {
  pending: "bg-muted-foreground/30",
  running: "bg-amber-500 animate-pulse",
  completed: "bg-emerald-500",
  failed: "bg-red-500",
}

export function StatusDot({
  status,
  className,
}: {
  status: SectionStatus
  className?: string
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "size-1.5 shrink-0 rounded-full transition-colors duration-200 ease-[var(--ease-out)]",
        STATUS_DOT[status],
        className
      )}
    />
  )
}

function SectionSkeleton() {
  return (
    <div className="space-y-2.5" aria-hidden>
      {[92, 76, 84, 61].map((width, i) => (
        <div
          key={i}
          className="h-3 animate-pulse rounded-sm bg-muted"
          style={{ width: `${width}%`, animationDelay: `${i * 120}ms` }}
        />
      ))}
    </div>
  )
}

export function SectionCard({ section }: { section: AnySection }) {
  const isRunning = section.status === "running"

  return (
    <section
      id={section.key}
      className="scroll-mt-32 border-t border-border py-8 first:border-t-0 first:pt-0"
    >
      <header className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1">
        <StatusDot status={section.status} />
        {isRunning ? (
          <Shimmer
            as="h2"
            className="font-mono text-[11px] tracking-[0.18em] uppercase"
          >
            {section.title}
          </Shimmer>
        ) : (
          <h2 className="font-mono text-[11px] tracking-[0.18em] text-foreground uppercase">
            {section.title}
          </h2>
        )}
        <span className="ml-auto flex items-center gap-3">
          <Confidence value={section.confidence} />
          {section.status === "pending" ? <Label>queued</Label> : null}
        </span>
      </header>

      {section.status === "failed" ? (
        <div className="scout-enter flex items-start gap-2 rounded-md border border-red-500/30 bg-red-500/5 p-3 text-sm">
          <AlertTriangleIcon className="mt-0.5 size-4 shrink-0 text-red-500" />
          <div>
            <p className="font-medium">This section could not be completed.</p>
            <p className="text-muted-foreground">
              {section.error?.message ?? "Unknown error."}
            </p>
          </div>
        </div>
      ) : section.status === "completed" ? (
        // Keyed so the enter animation replays when the skeleton is replaced.
        <div key="body" className="scout-enter">
          <SectionBody section={section} />
        </div>
      ) : (
        <SectionSkeleton />
      )}
    </section>
  )
}
