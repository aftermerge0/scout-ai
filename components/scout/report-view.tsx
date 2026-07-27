"use client"

import Link from "next/link"
import { AlertTriangleIcon, ClockIcon } from "lucide-react"

import {
  Sources,
  SourcesContent,
  SourcesTrigger,
} from "@/components/ai-elements/sources"
import { Button } from "@/components/ui/button"
import { useEvaluation } from "@/hooks/use-evaluation"
import { SECTION_ORDER } from "@/types/scout-api"
import type { AnySection, Evaluation } from "@/types/scout-api"

import { EvidenceChip, EvidenceProvider } from "./evidence"
import { Findings } from "./findings"
import { Label } from "./primitives"
import { ProgressRail, ReportHeader } from "./report-header"
import { SectionCard } from "./section-card"
import { SectionNav } from "./section-nav"

export function ReportView({ id }: { id: string }) {
  const { evaluation, error, isLoading, timedOut } = useEvaluation(id)

  if (isLoading && !evaluation) return <BootState />

  if (!evaluation) {
    return (
      <Notice
        title={
          error?.code === "NOT_FOUND"
            ? "Report not found"
            : "Could not load report"
        }
        message={error?.message ?? "Unknown error."}
      />
    )
  }

  if (evaluation.status === "failed") {
    return (
      <>
        <ReportHeader evaluation={evaluation} />
        <Shell>
          <Notice
            title="Evaluation failed"
            message={
              evaluation.error?.message ?? "The pipeline stopped unexpectedly."
            }
            phase={evaluation.error?.phase ?? undefined}
          />
        </Shell>
      </>
    )
  }

  const sections = orderSections(evaluation.sections)
  const failedSections = sections.filter((s) => s.status === "failed")

  return (
    <EvidenceProvider evidence={evaluation.evidence}>
      <ReportHeader evaluation={evaluation} />
      <Shell>
        <div className="space-y-6">
          {timedOut ? (
            <Banner
              tone="warn"
              icon={<ClockIcon className="size-4" />}
              title="Still running after 8 minutes"
            >
              Polling stopped. Start a fresh evaluation to try again.
              <Button
                size="sm"
                variant="outline"
                className="ml-2"
                nativeButton={false}
                render={<Link href="/">New evaluation</Link>}
              />
            </Banner>
          ) : null}

          {evaluation.status === "partial" ? (
            <Banner
              tone="warn"
              icon={<AlertTriangleIcon className="size-4" />}
              title="Partial report"
            >
              {failedSections.length} of {sections.length} sections failed:{" "}
              {failedSections.map((s) => s.title).join(", ")}. Everything else
              is complete.
            </Banner>
          ) : null}

          {evaluation.status === "queued" || evaluation.status === "running" ? (
            <ProgressRail evaluation={evaluation} />
          ) : null}

          <Headline evaluation={evaluation} />

          <Findings findings={evaluation.findings} />

          <EvidenceDrawer evaluation={evaluation} />
        </div>

        <div className="mt-10 grid gap-10 lg:grid-cols-[13rem_minmax(0,1fr)]">
          <SectionNav sections={sections} />
          {/* min-w-0 keeps wide section tables inside their own scroll container. */}
          <div className="min-w-0">
            {sections.map((section) => (
              <SectionCard key={section.key} section={section} />
            ))}
          </div>
        </div>
      </Shell>
    </EvidenceProvider>
  )
}

/** Contract §2: sections must render in the documented order regardless of payload order. */
function orderSections(sections: AnySection[]): AnySection[] {
  const byKey = new Map(sections.map((section) => [section.key, section]))
  return SECTION_ORDER.map((key) => byKey.get(key)).filter(
    (section): section is AnySection => !!section
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  // Bridges the swap from BootState to the first payload.
  return (
    <main className="scout-enter mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {children}
    </main>
  )
}

function Headline({ evaluation }: { evaluation: Evaluation }) {
  const { summary } = evaluation
  if (!summary.headline) return null

  return (
    <p className="max-w-3xl text-xl leading-snug text-balance">
      {summary.headline}
    </p>
  )
}

function EvidenceDrawer({ evaluation }: { evaluation: Evaluation }) {
  if (evaluation.evidence.length === 0) return null
  const official = evaluation.evidence.filter(
    (e) => e.sourceType === "official"
  )
  const external = evaluation.evidence.filter(
    (e) => e.sourceType === "external"
  )

  return (
    <Sources className="mb-0">
      <SourcesTrigger count={evaluation.evidence.length}>
        <span className="font-mono text-[11px] tracking-[0.14em] text-muted-foreground uppercase hover:text-foreground">
          {official.length} official · {external.length} third-party sources
        </span>
      </SourcesTrigger>
      <SourcesContent className="w-full max-w-full">
        <div className="flex flex-wrap gap-1.5">
          {evaluation.evidence.map((item) => (
            <EvidenceChip key={item.id} evidence={item} />
          ))}
        </div>
      </SourcesContent>
    </Sources>
  )
}

function Banner({
  tone,
  icon,
  title,
  children,
}: {
  tone: "warn" | "error"
  icon: React.ReactNode
  title: string
  children: React.ReactNode
}) {
  return (
    <div
      className={
        tone === "warn"
          ? "scout-enter flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-sm"
          : "scout-enter flex items-start gap-2 rounded-md border border-red-500/30 bg-red-500/5 p-3 text-sm"
      }
    >
      <span
        className={
          tone === "warn" ? "mt-0.5 text-amber-500" : "mt-0.5 text-red-500"
        }
      >
        {icon}
      </span>
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-muted-foreground">{children}</p>
      </div>
    </div>
  )
}

function Notice({
  title,
  message,
  phase,
}: {
  title: string
  message: string
  phase?: string
}) {
  return (
    <div className="scout-enter mx-auto max-w-xl space-y-4 py-24 text-center">
      <Label>{phase ? `failed at ${phase.replace(/_/g, " ")}` : "error"}</Label>
      <h1 className="text-xl font-medium">{title}</h1>
      <p className="text-sm text-muted-foreground">{message}</p>
      <Button
        variant="outline"
        size="sm"
        nativeButton={false}
        render={<Link href="/">Start a new evaluation</Link>}
      />
    </div>
  )
}

function BootState() {
  return (
    <div className="mx-auto max-w-xl space-y-3 py-32 text-center">
      <Label>Scout</Label>
      <p className="font-mono text-sm text-muted-foreground">
        opening report<span className="animate-pulse">…</span>
      </p>
    </div>
  )
}
