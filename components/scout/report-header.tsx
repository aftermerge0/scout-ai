"use client"

import Link from "next/link"
import { CheckIcon, LoaderIcon } from "lucide-react"

import { cn, asArray } from "@/lib/utils"
import type { Evaluation } from "@/types/scout-api"
import { PHASE_TITLES, PHASE_ORDER } from "@/types/scout-api"

import { Confidence, Label, VerdictPill } from "./primitives"

/** Sticky report header: identity on the left, verdict on the right. */
export function ReportHeader({ evaluation }: { evaluation: Evaluation }) {
  const { summary, progress, status } = evaluation
  const running = status === "queued" || status === "running"

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-6">
        <Link
          href="/"
          className="font-mono text-xs tracking-[0.2em] uppercase hover:text-muted-foreground"
        >
          Scout
        </Link>
        <span aria-hidden className="text-muted-foreground/40">
          /
        </span>
        <div className="flex min-w-0 items-baseline gap-2">
          <span className="truncate text-sm font-medium">
            {evaluation.companyName ?? evaluation.input}
          </span>
          {evaluation.domain ? (
            <span className="hidden truncate font-mono text-xs text-muted-foreground sm:inline">
              {evaluation.domain}
            </span>
          ) : null}
        </div>

        {/* The verdict lands mid-run; keyed so it eases in rather than popping. */}
        <div
          key={summary.overallScore === null ? "pending" : "scored"}
          className="scout-enter ml-auto flex items-center gap-4"
        >
          {summary.overallScore !== null ? (
            <span className="font-mono text-lg tabular-nums">
              {summary.overallScore.toFixed(1)}
              <span className="text-xs text-muted-foreground">/10</span>
            </span>
          ) : (
            <span className="font-mono text-lg text-muted-foreground/40 tabular-nums">
              -.-
            </span>
          )}
          {summary.verdict ? <VerdictPill verdict={summary.verdict} /> : null}
          <Confidence value={summary.confidence} className="hidden sm:inline" />
        </div>
      </div>

      {running ? (
        <div className="h-0.5 w-full bg-muted">
          <div
            className="h-full bg-foreground transition-[width] duration-500 ease-[var(--ease-out)]"
            style={{ width: `${progress.percent}%` }}
          />
        </div>
      ) : null}
    </header>
  )
}

/** Phase rail: one line per pipeline phase, mirrors progress.phases. */
export function ProgressRail({ evaluation }: { evaluation: Evaluation }) {
  const { progress } = evaluation

  return (
    <div className="rounded-md border border-border bg-muted/20 p-4">
      <div className="mb-3 flex items-center justify-between">
        <Label>Pipeline</Label>
        <span className="font-mono text-xs text-muted-foreground tabular-nums">
          {progress.sectionsCompleted}/{progress.sectionsTotal} sections ·{" "}
          {progress.percent}%
        </span>
      </div>
      <ol className="grid gap-2 sm:grid-cols-5">
        {PHASE_ORDER.map((key) => {
          const phase = asArray(progress.phases).find((p) => p.key === key)
          const state = phase?.status ?? "pending"
          return (
            <li key={key} className="flex items-center gap-2">
              <span
                className={cn(
                  "flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors duration-200 ease-[var(--ease-out)]",
                  state === "completed" &&
                    "border-emerald-500/40 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
                  state === "running" && "border-amber-500/50 bg-amber-500/10",
                  state === "failed" && "border-red-500/50 bg-red-500/15",
                  state === "pending" && "border-border"
                )}
              >
                {state === "completed" ? (
                  // Keyed so the tick eases in when the phase resolves.
                  <CheckIcon
                    key="done"
                    className="size-2.5 animate-[phase-check_160ms_var(--ease-out)_both]"
                  />
                ) : state === "running" ? (
                  <LoaderIcon className="size-2.5 animate-spin text-amber-500 [animation-duration:0.7s]" />
                ) : state === "failed" ? (
                  <span className="font-mono text-[9px] text-red-500">×</span>
                ) : null}
              </span>
              <span
                className={cn(
                  "font-mono text-[11px] leading-tight",
                  state === "pending"
                    ? "text-muted-foreground/60"
                    : "text-foreground"
                )}
              >
                {PHASE_TITLES[key]}
              </span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
