"use client"

import { useReducedMotion } from "motion/react"

import { DottedGlowBackground } from "@/components/ui/dotted-glow-background"

/**
 * Decorative dot field behind the hero. The canvas runs a rAF loop, so it is
 * skipped entirely under reduced motion rather than merely slowed, and it is
 * masked to fade out before it reaches the copy.
 */
export function HeroBackdrop() {
  const reduce = useReducedMotion()
  if (reduce) return null

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden [mask-image:radial-gradient(75%_60%_at_50%_35%,black,transparent)]"
    >
      <DottedGlowBackground
        gap={18}
        radius={1.4}
        color="rgba(113,113,122,0.55)"
        darkColor="rgba(161,161,170,0.45)"
        glowColor="rgba(56,189,248,0.55)"
        darkGlowColor="rgba(56,189,248,0.45)"
        opacity={0.5}
        speedMin={0.15}
        speedMax={0.5}
        speedScale={0.6}
      />
    </div>
  )
}
