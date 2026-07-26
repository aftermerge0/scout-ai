"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { ScoutApiError, getEvaluation } from "@/lib/api/client"
import type { Evaluation } from "@/types/scout-api"
import { isTerminal } from "@/types/scout-api"

/** Contract §5: stop after 8 minutes and offer a retry. */
const MAX_POLL_MS = 8 * 60 * 1000
const DEFAULT_INTERVAL_MS = 2000
const MAX_INTERVAL_MS = 8000
/** Back off only after this many consecutive 304s / unchanged etags. */
const UNCHANGED_BEFORE_BACKOFF = 3

export type EvaluationState = {
  evaluation: Evaluation | null
  error: { code: string; message: string } | null
  isLoading: boolean
  isPolling: boolean
  timedOut: boolean
}

export function useEvaluation(id: string): EvaluationState {
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null)
  const [error, setError] = useState<EvaluationState["error"]>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isPolling, setIsPolling] = useState(true)
  const [timedOut, setTimedOut] = useState(false)

  const etagRef = useRef<string | null>(null)
  const unchangedRef = useRef(0)
  const intervalRef = useRef(DEFAULT_INTERVAL_MS)

  // Reset during render when the report changes, rather than in an effect.
  const [renderedId, setRenderedId] = useState(id)
  if (renderedId !== id) {
    setRenderedId(id)
    setEvaluation(null)
    setError(null)
    setIsLoading(true)
    setIsPolling(true)
    setTimedOut(false)
  }

  const stop = useCallback(() => setIsPolling(false), [])

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined
    const startedAt = Date.now()
    const controller = new AbortController()

    // Reset per-id so navigating between reports doesn't leak polling state.
    etagRef.current = null
    unchangedRef.current = 0
    intervalRef.current = DEFAULT_INTERVAL_MS

    async function tick() {
      if (cancelled) return

      if (Date.now() - startedAt > MAX_POLL_MS) {
        setTimedOut(true)
        stop()
        return
      }

      try {
        const result = await getEvaluation(
          id,
          etagRef.current,
          controller.signal
        )
        if (cancelled) return

        if (result.notModified) {
          unchangedRef.current += 1
        } else {
          const previousEtag = etagRef.current
          etagRef.current = result.etag ?? result.data.poll.etag
          unchangedRef.current =
            previousEtag && previousEtag === etagRef.current
              ? unchangedRef.current + 1
              : 0

          setEvaluation(result.data)
          setError(null)
          intervalRef.current =
            result.data.poll.pollAfterMs || DEFAULT_INTERVAL_MS

          if (!result.data.poll.shouldPoll || isTerminal(result.data.status)) {
            setIsLoading(false)
            stop()
            return
          }
        }

        setIsLoading(false)

        if (unchangedRef.current >= UNCHANGED_BEFORE_BACKOFF) {
          intervalRef.current = Math.min(
            Math.round(intervalRef.current * 1.5),
            MAX_INTERVAL_MS
          )
          unchangedRef.current = 0
        }

        timer = setTimeout(tick, intervalRef.current)
      } catch (err) {
        if (cancelled || controller.signal.aborted) return
        const apiError =
          err instanceof ScoutApiError
            ? { code: err.code, message: err.message }
            : {
                code: "NETWORK_ERROR",
                message:
                  err instanceof Error ? err.message : "Failed to load report",
              }
        setError(apiError)
        setIsLoading(false)
        // 404 is permanent; anything else may be transient, so keep polling.
        if (err instanceof ScoutApiError && err.status === 404) {
          stop()
          return
        }
        timer = setTimeout(tick, MAX_INTERVAL_MS)
      }
    }

    void tick()

    return () => {
      cancelled = true
      controller.abort()
      if (timer) clearTimeout(timer)
    }
  }, [id, stop])

  return { evaluation, error, isLoading, isPolling, timedOut }
}
