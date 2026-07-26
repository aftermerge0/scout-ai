import { cn } from "@/lib/utils"

/**
 * Ordered-dither ramp, CSS only.
 *
 * Three stacked checkerboards at increasing cell size, each masked over a
 * different slice of the ramp. Coarser cells read as a lower density, so the
 * stack fades the way a 1-bit image does: by dropping dots, not opacity.
 */
const BANDS = [
  { size: "2px", mask: "linear-gradient(to top, black 0%, transparent 45%)" },
  {
    size: "3px",
    mask: "linear-gradient(to top, black 20%, transparent 70%)",
  },
  {
    size: "5px",
    mask: "linear-gradient(to top, black 45%, transparent 100%)",
  },
]

export function Dither({
  className,
  opacity,
}: {
  className?: string
  /** Omit to control opacity from className (e.g. per-theme utilities). */
  opacity?: number
}) {
  return (
    <span
      aria-hidden
      className={cn("pointer-events-none absolute text-foreground", className)}
      style={opacity === undefined ? undefined : { opacity }}
    >
      {BANDS.map((band) => (
        <span
          key={band.size}
          className="absolute inset-0"
          style={{
            backgroundImage:
              "repeating-conic-gradient(currentColor 0% 25%, transparent 0% 50%)",
            backgroundSize: `${band.size} ${band.size}`,
            maskImage: band.mask,
            WebkitMaskImage: band.mask,
          }}
        />
      ))}
    </span>
  )
}
