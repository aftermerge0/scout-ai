"use client"

import { useEffect, useState } from "react"

import { cn } from "@/lib/utils"
import type { AnySection } from "@/types/scout-api"

import { StatusDot } from "./section-card"
import { Label } from "./primitives"

/** Sticky table of contents; doubles as the live per-section status readout. */
export function SectionNav({ sections }: { sections: AnySection[] }) {
  const [active, setActive] = useState<string | null>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort(
            (a, b) => a.boundingClientRect.top - b.boundingClientRect.top
          )[0]
        if (visible) setActive(visible.target.id)
      },
      { rootMargin: "-30% 0px -60% 0px", threshold: 0 }
    )

    for (const section of sections) {
      const el = document.getElementById(section.key)
      if (el) observer.observe(el)
    }
    return () => observer.disconnect()
  }, [sections])

  return (
    <nav className="sticky top-24 hidden self-start lg:block">
      <Label className="mb-3 block">Sections</Label>
      <ul className="space-y-1">
        {sections.map((section) => (
          <li key={section.key}>
            <a
              href={`#${section.key}`}
              className={cn(
                "flex items-center gap-2 rounded-sm px-2 py-1 text-[13px] transition-[color,background-color] duration-150 ease-[var(--ease-out)]",
                active === section.key
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <StatusDot status={section.status} />
              <span className="truncate">{section.title}</span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
