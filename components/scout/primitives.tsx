import type { ComponentProps, ReactNode } from "react"

import { cn } from "@/lib/utils"
import type {
  PresenceLevel,
  QualityLevel,
  RecommendationVerdict,
  RiskLevel,
  SentimentLabel,
} from "@/types/scout-api"

/** Small uppercase key used for every label in the report. */
export function Label({ className, ...props }: ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase",
        className
      )}
      {...props}
    />
  )
}

/** Key/value row: label column, mono value column. */
export function Field({
  label,
  children,
  className,
}: {
  label: string
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1 border-b border-dashed border-border/60 py-2 last:border-0 sm:flex-row sm:items-baseline sm:gap-4",
        className
      )}
    >
      <Label className="sm:w-40 sm:shrink-0">{label}</Label>
      <div className="min-w-0 text-sm">{children}</div>
    </div>
  )
}

export function Empty({ children = "not found" }: { children?: ReactNode }) {
  return (
    <span className="font-mono text-sm text-muted-foreground/70">
      {children}
    </span>
  )
}

export function Value({ children }: { children: ReactNode }) {
  if (children === null || children === undefined || children === "") {
    return <Empty />
  }
  return <span className="font-mono">{children}</span>
}

/** Comma-free tag row used for lists (investors, customers, regions…). */
export function Tags({ items }: { items: string[] }) {
  if (items.length === 0) return <Empty />
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <span
          key={item}
          className="rounded-sm border border-border bg-muted/40 px-1.5 py-0.5 font-mono text-xs"
        >
          {item}
        </span>
      ))}
    </div>
  )
}

export function Bullets({
  items,
  marker = "—",
  className,
}: {
  items: string[]
  marker?: string
  className?: string
}) {
  if (items.length === 0) return <Empty />
  return (
    <ul className={cn("space-y-1.5", className)}>
      {items.map((item) => (
        <li key={item} className="flex gap-2 text-sm leading-relaxed">
          <span aria-hidden className="mt-px font-mono text-muted-foreground">
            {marker}
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

/** Horizontal 0–100 meter with a mono readout. */
export function Meter({
  value,
  label,
  tone = "neutral",
}: {
  value: number
  label?: string
  tone?: "neutral" | "good" | "warn" | "bad"
}) {
  const toneClass = {
    neutral: "bg-foreground",
    good: "bg-emerald-500",
    warn: "bg-amber-500",
    bad: "bg-red-500",
  }[tone]

  return (
    <div className="flex items-center gap-3">
      <div className="h-1.5 w-full max-w-56 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-700",
            toneClass
          )}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
      <span className="font-mono text-xs tabular-nums">
        {label ?? `${value}%`}
      </span>
    </div>
  )
}

// --- Signal tokens ----------------------------------------------------------

const RISK_TONE: Record<RiskLevel, string> = {
  low: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  medium:
    "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  high: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400",
  unknown: "border-border bg-muted/50 text-muted-foreground",
}

const PRESENCE_TONE: Record<PresenceLevel, string> = {
  yes: "text-emerald-600 dark:text-emerald-400",
  limited: "text-amber-600 dark:text-amber-400",
  no: "text-red-600 dark:text-red-400",
  unknown: "text-muted-foreground",
}

const PRESENCE_GLYPH: Record<PresenceLevel, string> = {
  yes: "yes",
  limited: "limited",
  no: "no",
  unknown: "—",
}

const QUALITY_TONE: Record<QualityLevel, string> = {
  excellent: "text-emerald-600 dark:text-emerald-400",
  good: "text-emerald-600/90 dark:text-emerald-400/90",
  average: "text-muted-foreground",
  fair: "text-amber-600 dark:text-amber-400",
  poor: "text-red-600 dark:text-red-400",
  unknown: "text-muted-foreground",
}

const SENTIMENT_TONE: Record<SentimentLabel, string> = {
  positive: RISK_TONE.low,
  mixed: RISK_TONE.medium,
  neutral: RISK_TONE.unknown,
  negative: RISK_TONE.high,
}

const VERDICT_TONE: Record<RecommendationVerdict, string> = {
  yes: RISK_TONE.low,
  conditional: RISK_TONE.medium,
  no: RISK_TONE.high,
}

const VERDICT_LABEL: Record<RecommendationVerdict, string> = {
  yes: "adopt",
  conditional: "adopt with conditions",
  no: "do not adopt",
}

export function Pill({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode
  tone?: "neutral" | RiskLevel
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 font-mono text-[11px] whitespace-nowrap",
        tone === "neutral" ? RISK_TONE.unknown : RISK_TONE[tone],
        className
      )}
    >
      {children}
    </span>
  )
}

export function RiskPill({ level }: { level: RiskLevel }) {
  return <Pill tone={level}>{level}</Pill>
}

export function VerdictPill({
  verdict,
  className,
}: {
  verdict: RecommendationVerdict
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm border px-2 py-0.5 font-mono text-xs",
        VERDICT_TONE[verdict],
        className
      )}
    >
      {VERDICT_LABEL[verdict]}
    </span>
  )
}

export function SentimentPill({ sentiment }: { sentiment: SentimentLabel }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm border px-1.5 py-0.5 font-mono text-[11px]",
        SENTIMENT_TONE[sentiment]
      )}
    >
      {sentiment}
    </span>
  )
}

export function Presence({ value }: { value: PresenceLevel }) {
  return (
    <span className={cn("font-mono text-xs", PRESENCE_TONE[value])}>
      {PRESENCE_GLYPH[value]}
    </span>
  )
}

export function Quality({ value }: { value: QualityLevel }) {
  return (
    <span className={cn("font-mono text-xs", QUALITY_TONE[value])}>
      {value}
    </span>
  )
}

/** Confidence readout; <70 reads as inferred per contract §9.3. */
export function Confidence({
  value,
  className,
}: {
  value: number | null
  className?: string
}) {
  if (value === null) return null
  const inferred = value < 70
  return (
    <span
      className={cn(
        "font-mono text-[11px] tabular-nums",
        inferred ? "text-muted-foreground/70 italic" : "text-muted-foreground",
        className
      )}
      title={inferred ? "Inferred — low confidence" : undefined}
    >
      {value}%{inferred ? " inferred" : ""}
    </span>
  )
}

/** Dense bordered table shell shared by feature/pricing/matrix views. */
export function DataTable({
  head,
  children,
  className,
}: {
  head: ReactNode[]
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full min-w-[32rem] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border">
            {head.map((cell, i) => (
              <th
                key={i}
                className="px-2 py-1.5 text-left font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase first:pl-0 last:pr-0"
              >
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}

export function Row({ children }: { children: ReactNode }) {
  return (
    <tr className="border-b border-dashed border-border/60 last:border-0">
      {children}
    </tr>
  )
}

export function Cell({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <td className={cn("px-2 py-2 align-top first:pl-0 last:pr-0", className)}>
      {children}
    </td>
  )
}
