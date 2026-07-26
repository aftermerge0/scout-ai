"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { SlidersHorizontalIcon } from "lucide-react"

import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input"
import { Suggestion, Suggestions } from "@/components/ai-elements/suggestion"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { ScoutApiError, startEvaluation } from "@/lib/api/client"
import type { EvaluationContext } from "@/types/scout-api"

import { Label } from "./primitives"

const EXAMPLES = ["linear.app", "supabase.com", "vercel.com", "clerk.com"]

const COMPANY_SIZES: NonNullable<EvaluationContext["companySize"]>[] = [
  "1-50",
  "51-200",
  "201-1000",
  "1000+",
]

export function EvaluateForm() {
  const router = useRouter()
  const [input, setInput] = useState("")
  const [useCase, setUseCase] = useState("")
  const [companySize, setCompanySize] = useState<
    EvaluationContext["companySize"] | undefined
  >()
  const [priorities, setPriorities] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [, startNavigation] = useTransition()

  async function submit(value: string) {
    const trimmed = value.trim()
    if (trimmed.length < 2 || submitting) return

    setSubmitting(true)
    setError(null)

    const priorityList = priorities
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean)
      .slice(0, 8)

    const context: EvaluationContext = {}
    if (useCase.trim()) context.useCase = useCase.trim()
    if (companySize) context.companySize = companySize
    if (priorityList.length > 0) context.priorities = priorityList

    try {
      const created = await startEvaluation(
        trimmed,
        Object.keys(context).length > 0 ? context : undefined
      )
      startNavigation(() => {
        router.push(created.reportUrl || `/report/${created.id}`)
      })
    } catch (err) {
      setSubmitting(false)
      setError(
        err instanceof ScoutApiError
          ? err.message
          : "Could not start the evaluation. Try again."
      )
    }
  }

  function handleSubmit(message: PromptInputMessage) {
    void submit(message.text)
  }

  return (
    <div className="space-y-4">
      <PromptInput onSubmit={handleSubmit} className="rounded-lg">
        <PromptInputBody>
          <PromptInputTextarea
            value={input}
            onChange={(event) => setInput(event.currentTarget.value)}
            placeholder="Company name, domain, or URL"
            className="min-h-14 font-mono text-sm"
            maxLength={200}
            autoFocus
          />
        </PromptInputBody>
        <PromptInputFooter>
          <PromptInputTools>
            <Label>{input.trim().length}/200</Label>
          </PromptInputTools>
          <PromptInputSubmit
            status={submitting ? "submitted" : undefined}
            disabled={input.trim().length < 2 || submitting}
            variant="default"
            size="sm"
            className="gap-2"
          >
            {submitting ? null : (
              <span className="font-mono text-xs">Evaluate</span>
            )}
          </PromptInputSubmit>
        </PromptInputFooter>
      </PromptInput>

      <Collapsible>
        <CollapsibleTrigger
          render={
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 font-mono text-xs text-muted-foreground"
            />
          }
        >
          <SlidersHorizontalIcon className="size-3.5" />
          Add your context
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3 space-y-4 rounded-md border border-border p-4">
          <div className="space-y-1.5">
            <Label>Use case</Label>
            <Textarea
              value={useCase}
              onChange={(event) => setUseCase(event.currentTarget.value)}
              maxLength={500}
              rows={2}
              placeholder="Replace Jira for a 40-person product team"
              className="text-sm"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Company size</Label>
              <Select
                value={companySize}
                onValueChange={(value) =>
                  setCompanySize(value as EvaluationContext["companySize"])
                }
              >
                <SelectTrigger className="w-full font-mono text-xs">
                  <SelectValue placeholder="Select size" />
                </SelectTrigger>
                <SelectContent>
                  {COMPANY_SIZES.map((size) => (
                    <SelectItem
                      key={size}
                      value={size}
                      className="font-mono text-xs"
                    >
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Priorities</Label>
              <Input
                value={priorities}
                onChange={(event) => setPriorities(event.currentTarget.value)}
                placeholder="security, pricing, dx"
                className="font-mono text-xs"
              />
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      <div className="flex flex-wrap items-center gap-2">
        <Label className="mr-1">Try</Label>
        <Suggestions>
          {EXAMPLES.map((example) => (
            <Suggestion
              key={example}
              suggestion={example}
              onClick={(value) => {
                setInput(value)
                void submit(value)
              }}
              className="h-7 rounded-md px-2.5 font-mono text-xs transition-[color,background-color,transform] duration-150 ease-[var(--ease-out)] active:scale-[0.97]"
              disabled={submitting}
            />
          ))}
        </Suggestions>
      </div>

      {error ? (
        <p className="font-mono text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}
    </div>
  )
}
