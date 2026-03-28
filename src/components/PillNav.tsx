import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { gsap } from "gsap"
import { cn } from "@/lib/utils"

interface NavItem {
  label: string
  href: string
}

interface PillNavProps {
  brandText?: string
  logo?: string
  logoAlt?: string
  items: NavItem[]
  activeHref: string
  actionLabel?: string
  onActionClick?: () => void
  className?: string
  ease?: string
  baseColor?: string
  pillColor?: string
  hoveredPillTextColor?: string
  pillTextColor?: string
  theme?: "light" | "dark"
  initialLoadAnimation?: boolean
  onNavigate?: (href: string) => void
}

export default function PillNav({
  brandText,
  logo,
  logoAlt = "Logo",
  items,
  activeHref,
  actionLabel,
  onActionClick,
  className,
  ease = "power2.out",
  baseColor,
  pillColor,
  pillTextColor,
  theme = "dark",
  initialLoadAnimation = false,
  onNavigate,
}: PillNavProps) {
  const [hovered, setHovered] = useState<string | null>(null)
  const pillRef  = useRef<HTMLDivElement>(null)
  const navRef   = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<Map<string, HTMLButtonElement>>(new Map())
  const mounted  = useRef(false)

  const isLight = theme === "light"
  const bg      = baseColor   ?? (isLight ? "#ffffff" : "#0a0a0a")
  const pill    = pillColor   ?? (isLight ? "#000000" : "#ffffff")
  const pillTxt = pillTextColor ?? (isLight ? "#000000" : "#000000")

  const target = hovered ?? activeHref

  // Move the pill to the target element using GSAP
  useLayoutEffect(() => {
    const el  = itemRefs.current.get(target)
    const nav = navRef.current
    const pillEl = pillRef.current
    if (!el || !nav || !pillEl) return

    const navRect = nav.getBoundingClientRect()
    const elRect  = el.getBoundingClientRect()
    const x = elRect.left - navRect.left

    if (!mounted.current && !initialLoadAnimation) {
      // Snap on first render — no animation
      gsap.set(pillEl, { x, width: elRect.width, height: elRect.height, opacity: 1 })
      mounted.current = true
    } else {
      gsap.to(pillEl, {
        x,
        width:    elRect.width,
        height:   elRect.height,
        opacity:  1,
        duration: 0.35,
        ease,
      })
    }
  }, [target, items, ease, initialLoadAnimation])

  // Initial load animation: fade + slide in from top
  useEffect(() => {
    if (!initialLoadAnimation) return
    const pillEl = pillRef.current
    const nav    = navRef.current
    if (!pillEl || !nav) return

    const buttons = Array.from(itemRefs.current.values())

    gsap.set(pillEl,  { opacity: 0, y: -8 })
    gsap.set(buttons, { opacity: 0, y: -6 })

    gsap.to(buttons, { opacity: 1, y: 0, duration: 0.4, stagger: 0.06, ease, delay: 0.1 })
    gsap.to(pillEl,  { opacity: 1, y: 0, duration: 0.4, ease, delay: 0.25 })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      className={cn("inline-flex items-center gap-3 px-2 py-1.5 rounded-full", className)}
      style={{ background: bg }}
    >
      {/* Logo */}
      {logo && (
        <img
          src={logo}
          alt={logoAlt}
          className="h-8 w-8 ml-1 shrink-0 object-contain pointer-events-none select-none"
          draggable={false}
        />
      )}

      {brandText && (
        <span className="ml-1 px-2 text-sm font-semibold tracking-tight text-foreground pointer-events-none select-none whitespace-nowrap">
          {brandText}
        </span>
      )}

      {/* Nav items */}
      <div ref={navRef} className="relative flex items-center">
        {/* GSAP-animated pill */}
        <div
          ref={pillRef}
          className="absolute top-0 left-0 rounded-full pointer-events-none opacity-0"
          style={{ background: pill }}
        />

        {items.map((item) => {
          const onPill = item.href === activeHref || item.href === hovered

          return (
            <button
              key={item.href}
              ref={(el) => { if (el) itemRefs.current.set(item.href, el) }}
              type="button"
              onClick={() => onNavigate?.(item.href)}
              onMouseEnter={() => setHovered(item.href)}
              onMouseLeave={() => setHovered(null)}
              className="relative z-10 px-4 py-1.5 rounded-full text-sm font-medium select-none transition-colors duration-150"
              style={{
                color: onPill
                  ? pillTxt
                  : isLight ? "rgba(0,0,0,0.45)" : "rgba(255,255,255,0.4)",
              }}
            >
              {item.label}
            </button>
          )
        })}
      </div>

      {actionLabel && (
        <button
          type="button"
          onClick={onActionClick}
          aria-label={actionLabel}
          title={actionLabel}
          className="ml-1 h-8 w-8 rounded-full border border-border bg-background text-foreground hover:bg-muted/40 transition-colors inline-flex items-center justify-center"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-3.5 w-3.5"
            aria-hidden="true"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      )}
    </div>
  )
}
