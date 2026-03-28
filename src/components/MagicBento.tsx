import { useMemo, useRef } from "react"
import type { CSSProperties, ReactNode, MouseEvent } from "react"
import { cn } from "@/lib/utils"

interface MagicBentoProps {
  children: ReactNode
  className?: string
  textAutoHide?: boolean
  enableStars?: boolean
  enableSpotlight?: boolean
  enableBorderGlow?: boolean
  enableTilt?: boolean
  enableMagnetism?: boolean
  clickEffect?: boolean
  spotlightRadius?: number
  particleCount?: number
  glowColor?: string
  disableAnimations?: boolean
}

interface MagicBentoItemProps {
  children: ReactNode
  className?: string
}

export function MagicBentoItem({ children, className }: MagicBentoItemProps) {
  return (
    <article className={cn("relative rounded-2xl border border-border bg-card p-0 overflow-hidden", className)}>
      {children}
    </article>
  )
}

export default function MagicBento({
  children,
  className,
  textAutoHide = true,
  enableStars = true,
  enableSpotlight = true,
  enableBorderGlow = true,
  enableTilt = false,
  enableMagnetism = false,
  clickEffect = true,
  spotlightRadius = 400,
  particleCount = 12,
  glowColor = "132, 0, 255",
  disableAnimations = false,
}: MagicBentoProps) {
  const rootRef = useRef<HTMLDivElement>(null)

  const style = useMemo(() => {
    return {
      "--bento-glow": glowColor,
      "--bento-spotlight": `${spotlightRadius}px`,
    } as CSSProperties
  }, [glowColor, spotlightRadius])

  function handleMouseMove(e: MouseEvent<HTMLDivElement>) {
    if (!enableSpotlight || !rootRef.current) return
    const rect = rootRef.current.getBoundingClientRect()
    rootRef.current.style.setProperty("--mx", `${e.clientX - rect.left}px`)
    rootRef.current.style.setProperty("--my", `${e.clientY - rect.top}px`)
  }

  return (
    <div
      ref={rootRef}
      style={style}
      onMouseMove={handleMouseMove}
      className={cn(
        "relative grid grid-cols-1 md:grid-cols-6 gap-3",
        textAutoHide && "[&_p]:truncate",
        className,
      )}
      data-stars={enableStars}
      data-spotlight={enableSpotlight}
      data-border-glow={enableBorderGlow}
      data-tilt={enableTilt}
      data-magnetism={enableMagnetism}
      data-click-effect={clickEffect}
      data-particle-count={particleCount}
      data-disable-animations={disableAnimations}
    >
      {enableSpotlight && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-2xl opacity-80"
          style={{
            background:
              "radial-gradient(var(--bento-spotlight) circle at var(--mx, 50%) var(--my, 50%), rgba(var(--bento-glow), 0.12), transparent 42%)",
          }}
        />
      )}
      {children}
    </div>
  )
}
