"use client"

import React, { useState, useEffect, useRef, useLayoutEffect } from "react"
import gsap from "gsap"
import { useNavigate } from "react-router-dom"
import { Home, Link2, BarChart3 } from "lucide-react"
import { cn } from "@/lib/utils"
import PillNav from "@/components/PillNav"
import MagicBento, { MagicBentoItem } from "@/components/MagicBento"
import { InteractiveMenu, type InteractiveMenuItem } from "@/components/ui/modern-mobile-menu"
import { getApiBaseUrl } from "@/lib/api"
import { auth } from "@/lib/auth"
import { useUsers, useUserNotifications, useSetMode, useTelegramLink, useSummariseNotifications, useCalendarCurrent, useSetAppSession, SummaryData } from "@/hooks/use-api"
import type { ManualMode } from "@/types/api"
import type { IconType } from "react-icons"
import { FaSlack, FaGithub, FaYoutube, FaTelegramPlane, FaChrome } from "react-icons/fa"
import { SiGmail, SiGooglecalendar } from "react-icons/si"
import DynamicIcon, { AppIcon } from "@/components/DynamicIcon"
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  RadialBarChart, RadialBar, Legend,
} from "recharts"

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MODE_COLORS: Record<ManualMode, string> = {
  auto:    "text-blue-400",
  focus:   "text-purple-400",
  work:    "text-green-400",
  meeting: "text-yellow-400",
  relax:   "text-sky-400",
  sleep:   "text-slate-400",
}

const MODES: { value: ManualMode; label: string; description: string; icon: string; glow: string; ring: string; bg: string; text: string }[] = [
  { value: "auto",    label: "Auto",    description: "AI infers from context",   icon: "✦", glow: "rgba(96,165,250,0.35)",  ring: "border-blue-400/60",   bg: "bg-blue-400/10",   text: "text-blue-400"   },
  { value: "focus",   label: "Focus",   description: "Deep work, zero noise",    icon: "◎", glow: "rgba(167,139,250,0.35)", ring: "border-purple-400/60", bg: "bg-purple-400/10", text: "text-purple-400" },
  { value: "work",    label: "Work",    description: "General office activity",  icon: "⬡", glow: "rgba(74,222,128,0.35)",  ring: "border-green-400/60",  bg: "bg-green-400/10",  text: "text-green-400"  },
  { value: "meeting", label: "Meeting", description: "In a call or standup",     icon: "⬤", glow: "rgba(250,204,21,0.35)",  ring: "border-yellow-400/60", bg: "bg-yellow-400/10", text: "text-yellow-400" },
  { value: "relax",   label: "Relax",   description: "Free time, show all",      icon: "◇", glow: "rgba(56,189,248,0.35)",  ring: "border-sky-400/60",    bg: "bg-sky-400/10",    text: "text-sky-400"    },
  { value: "sleep",   label: "Sleep",   description: "Do not disturb",           icon: "◐", glow: "rgba(148,163,184,0.35)", ring: "border-slate-400/60",  bg: "bg-slate-400/10",  text: "text-slate-400"  },
]

const SOURCE_ICONS: Record<string, string> = {
  slack: "💬", gmail: "📧", github: "🐙", calendar: "📅", youtube: "▶️",
}


// ─── Shared notification list ─────────────────────────────────────────────────

function NotifList({
  items, emptyText, accent,
}: {
  items: { id: string; source_app: string; message: string; triggered_at: string }[]
  emptyText: string
  accent: string
}) {
  if (items.length === 0) {
    return <div className="py-8 text-center text-xs text-muted-foreground">{emptyText}</div>
  }
  return (
    <ul className="divide-y divide-border">
      {items.map((n) => (
        <li key={n.id} className="flex items-start gap-3 px-5 py-3">
          <span className={cn("shrink-0 mt-0.5 w-1.5 h-1.5 rounded-full mt-1.5", accent)} />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-foreground truncate">{n.message}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5 capitalize">{n.source_app}</p>
          </div>
          <span className="text-[10px] text-muted-foreground shrink-0 tabular-nums whitespace-nowrap">
            {new Date(n.triggered_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        </li>
      ))}
    </ul>
  )
}

// ─── Mode Switcher ────────────────────────────────────────────────────────────

function ModeSwitcher({
  current,
  onSelect,
  disabled,
}: {
  current: ManualMode
  onSelect: (mode: ManualMode) => void
  disabled: boolean
}) {
  const cardRefs = useRef<(HTMLButtonElement | null)[]>([])

  // Animate newly selected card: glow pulse + scale pop
  useLayoutEffect(() => {
    const idx = MODES.findIndex((m) => m.value === current)
    const el = cardRefs.current[idx]
    if (!el) return
    gsap.fromTo(
      el,
      { scale: 0.94, opacity: 0.7 },
      { scale: 1, opacity: 1, duration: 0.35, ease: "back.out(1.8)" },
    )
  }, [current])

  function handleHover(idx: number, entering: boolean) {
    const el = cardRefs.current[idx]
    if (!el) return
    const isCurrent = MODES[idx].value === current
    gsap.to(el, {
      scale: entering ? (isCurrent ? 1.04 : 1.06) : 1,
      duration: 0.2,
      ease: "power2.out",
    })
  }

  function handleClick(mode: ManualMode, idx: number) {
    if (disabled || mode === current) return
    const el = cardRefs.current[idx]
    if (el) {
      gsap.timeline()
        .to(el, { scale: 0.92, duration: 0.1, ease: "power2.in" })
        .to(el, { scale: 1.05, duration: 0.2, ease: "back.out(2)" })
        .to(el, { scale: 1,    duration: 0.15, ease: "power2.out" })
    }
    onSelect(mode)
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Mode</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {MODES.map((m, idx) => {
          const isActive = m.value === current
          return (
            <button
              key={m.value}
              ref={(el) => { cardRefs.current[idx] = el }}
              disabled={disabled}
              onClick={() => handleClick(m.value, idx)}
              onMouseEnter={() => handleHover(idx, true)}
              onMouseLeave={() => handleHover(idx, false)}
              className={cn(
                "relative flex flex-col items-center justify-center gap-1.5 rounded-xl border py-3.5 px-2 transition-colors duration-200",
                "disabled:cursor-not-allowed",
                isActive
                  ? cn("border-2", m.ring, m.bg)
                  : "border-border bg-transparent hover:bg-white/5",
              )}
              style={isActive ? { boxShadow: `0 0 18px 2px ${m.glow}, 0 0 6px 1px ${m.glow}` } : undefined}
            >
              {/* Active indicator dot */}
              {isActive && (
                <span
                  className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full animate-pulse"
                  style={{ backgroundColor: m.glow.replace("0.35", "0.9") }}
                />
              )}

              <span className={cn("text-xl leading-none select-none", isActive ? m.text : "text-muted-foreground")}>
                {m.icon}
              </span>
              <span className={cn("text-[11px] font-semibold", isActive ? m.text : "text-foreground")}>
                {m.label}
              </span>
              <span className="text-[9px] text-muted-foreground text-center leading-tight px-0.5">
                {m.description}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Summary modal ───────────────────────────────────────────────────────────

const THINKING_STEPS = [
  "Reading your notification history…",
  "Analysing delivery patterns…",
  "Evaluating blocked interruptions…",
  "Calculating focus time saved…",
  "Identifying top signal sources…",
  "Composing your summary…",
]

function SummaryModal({ summary, loading, onClose }: { summary: SummaryData | null; loading: boolean; onClose: () => void }) {
  const [stepIndex, setStepIndex] = useState(0)
  const [visibleSteps, setVisibleSteps] = useState<number[]>([0])

  useEffect(() => {
    if (!loading) return
    setStepIndex(0)
    setVisibleSteps([0])
    const interval = setInterval(() => {
      setStepIndex((prev) => {
        const next = prev + 1
        if (next >= THINKING_STEPS.length) {
          clearInterval(interval)
          return prev
        }
        setVisibleSteps((s) => [...s, next])
        return next
      })
    }, 650)
    return () => clearInterval(interval)
  }, [loading])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={loading ? undefined : onClose}
    >
      <div
        className="w-full max-w-sm md:max-w-md rounded-2xl border border-border bg-card shadow-2xl animate-in fade-in zoom-in-95 duration-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 md:px-5 pt-5 pb-4">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold tracking-widest uppercase text-violet-400">Today's summary</span>
          </div>
          {!loading && (
            <button
              type="button"
              onClick={onClose}
              className="h-6 w-6 shrink-0 rounded-md flex items-center justify-center text-muted-foreground/60 hover:text-foreground transition-colors text-sm"
            >
              ✕
            </button>
          )}
        </div>

        {loading ? (
          /* ── Thinking state ── */
          <div className="px-4 md:px-5 pb-6 space-y-1.5">
            {THINKING_STEPS.map((step, i) => (
              <div
                key={step}
                className={cn(
                  "flex items-center gap-3 py-1 transition-all duration-500",
                  visibleSteps.includes(i) ? "opacity-100" : "opacity-0 pointer-events-none h-0 overflow-hidden",
                )}
              >
                <div className="w-4 shrink-0 flex items-center justify-center">
                  {i === stepIndex ? (
                    <span className="w-3 h-3 rounded-full border-[1.5px] border-violet-400 border-t-transparent animate-spin block" />
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-400/50 block" />
                  )}
                </div>
                <span className={cn(
                  "text-[13px] leading-relaxed transition-colors duration-300",
                  i === stepIndex ? "text-foreground" : "text-muted-foreground/50",
                )}>
                  {step}
                </span>
              </div>
            ))}
          </div>
        ) : summary ? (
          <>
            {/* Headline */}
            <div className="px-4 md:px-5 pb-4">
              <p className="text-[15px] font-semibold text-foreground leading-snug">{summary.headline}</p>
            </div>

            {/* Stats */}
            {summary.stats.length > 0 && (
              <div className="px-4 md:px-5 pb-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {summary.stats.map((s) => {
                    // If the stat value looks like an app name (non-numeric), try to show its brand icon.
                    // AppIcon auto-guesses the icon across all react-icons packages — no mapping needed.
                    const looksLikeApp = s.label.toLowerCase().includes("app") || isNaN(Number(s.value))
                    const appName = String(s.value).toLowerCase().trim()
                    return (
                      <div
                        key={s.label}
                        className="flex flex-col rounded-xl border border-border/60 bg-muted/20 py-3 px-2 items-center gap-1.5"
                      >
                        {looksLikeApp ? (
                          <>
                            <span className="text-2xl leading-none text-muted-foreground">
                              <AppIcon app={appName} fallback={
                                <span className="text-[13px] font-semibold text-foreground capitalize">{appName}</span>
                              } />
                            </span>
                            <span className="text-[10px] text-muted-foreground/70 text-center leading-tight capitalize">{appName}</span>
                            <span className="text-[9px] text-muted-foreground/40 text-center leading-tight uppercase tracking-wider">{s.label}</span>
                          </>
                        ) : (
                          <>
                            <span className="text-[18px] font-bold text-foreground tabular-nums leading-none">{s.value}</span>
                            <span className="text-[10px] text-muted-foreground/70 text-center leading-tight">{s.label}</span>
                          </>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Divider */}
            <div className="mx-4 md:mx-5 border-t border-border/40 mb-4" />

            {/* Insights */}
            {summary.insights.length > 0 && (
              <div className="px-4 md:px-5 pb-4 space-y-3">
                {summary.insights.map((insight, i) => (
                  <p key={i} className="text-[13px] text-foreground/80 leading-relaxed">
                    {insight}
                  </p>
                ))}
              </div>
            )}

            {/* Tip */}
            {summary.tip && (
              <div className="mx-4 md:mx-5 mb-5 rounded-xl border border-border/40 bg-muted/20 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/50 mb-1">Suggestion</p>
                <p className="text-[12px] text-muted-foreground leading-relaxed">{summary.tip}</p>
              </div>
            )}

            {/* Footer */}
            <div className="px-4 md:px-5 pb-5">
              <button
                type="button"
                onClick={onClose}
                className="w-full h-9 rounded-xl border border-border/60 bg-muted/20 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
              >
                Done
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}

// ─── App Switcher ─────────────────────────────────────────────────────────────

const APP_POOL: { app_name: string; app_category: string; icon?: string }[] = [
  { app_name: "vscode",   app_category: "productivity",  icon: "SiVisualstudiocode" },
  { app_name: "notion",   app_category: "productivity"  },
  { app_name: "figma",    app_category: "productivity"  },
  { app_name: "excel",    app_category: "productivity",  icon: "SiMicrosoftexcel"   },
  { app_name: "terminal", app_category: "productivity",  icon: "GoTerminal"         },
  { app_name: "slack",    app_category: "communication" },
  { app_name: "zoom",     app_category: "communication" },
  { app_name: "gmail",    app_category: "communication" },
  { app_name: "teams",    app_category: "communication", icon: "SiMicrosoftteams"  },
  { app_name: "discord",  app_category: "communication" },
  { app_name: "youtube",  app_category: "leisure"       },
  { app_name: "spotify",  app_category: "leisure"       },
  { app_name: "reddit",   app_category: "leisure"       },
  { app_name: "twitter",  app_category: "leisure"       },
  { app_name: "netflix",  app_category: "leisure"       },
]

const CATEGORY_COLOR: Record<string, string> = {
  productivity:  "text-green-400",
  communication: "text-blue-400",
  leisure:       "text-purple-400",
}

function AppSwitcher({ userId, activeApp }: { userId: string; activeApp: string | null }) {
  const setApp = useSetAppSession()

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Active App</p>
        {activeApp && (
          <span className="text-[11px] text-muted-foreground">
            Currently: <span className="text-foreground font-medium capitalize">{activeApp}</span>
          </span>
        )}
      </div>
      <div className="grid grid-cols-5 gap-1.5">
        {APP_POOL.map((app) => {
          const isActive = activeApp === app.app_name
          return (
            <button
              key={app.app_name}
              type="button"
              disabled={setApp.isPending}
              onClick={() => setApp.mutate({ userId, app_name: app.app_name, app_category: app.app_category })}
              className={cn(
                "flex flex-col items-center gap-1.5 py-2.5 px-1 rounded-lg border text-center transition-all",
                "disabled:opacity-40 disabled:cursor-not-allowed",
                isActive
                  ? "border-foreground/30 bg-foreground/10"
                  : "border-border bg-transparent hover:bg-white/5 hover:border-border/80",
              )}
            >
              {app.icon ? (
                <DynamicIcon
                  name={app.icon}
                  className={cn("w-4 h-4", isActive ? CATEGORY_COLOR[app.app_category] : "text-muted-foreground")}
                  fallback={<span className="w-4 h-4 block" />}
                />
              ) : (
                <AppIcon
                  app={app.app_name}
                  className={cn("w-4 h-4", isActive ? CATEGORY_COLOR[app.app_category] : "text-muted-foreground")}
                  fallback={<span className="w-4 h-4 block" />}
                />
              )}
              <span className={cn("text-[9px] font-medium capitalize leading-tight", isActive ? CATEGORY_COLOR[app.app_category] : "text-muted-foreground")}>
                {app.app_name}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Home tab ─────────────────────────────────────────────────────────────────

function HomeTab({ userId }: { userId: string }) {
  const { data: users } = useUsers()
  const user = users?.find((u) => u.id === userId)
  const { data: notifications } = useUserNotifications(userId)
  const setMode = useSetMode()
  const summarise = useSummariseNotifications()
  const [summaryText, setSummaryText] = useState<SummaryData | null>(null)
  const [showSummaryModal, setShowSummaryModal] = useState(false)

  const delivered = notifications?.filter((n) => n.status === "sent" || n.status === "delivered") ?? []
  const queued    = notifications?.filter((n) => n.status === "queued") ?? []
  const blocked   = notifications?.filter((n) => n.status === "blocked") ?? []

  function handleMode(mode: ManualMode) {
    setMode.mutate({ userId, mode })
  }

  if (!user) {
    return <div className="flex items-center justify-center py-24 text-sm text-muted-foreground">Loading…</div>
  }

  return (<>
    <div className="max-w-6xl mx-auto py-8 px-4 md:px-6">
      <MagicBento
        textAutoHide={true}
        enableStars
        enableSpotlight
        enableBorderGlow={true}
        enableTilt={false}
        enableMagnetism={false}
        clickEffect
        spotlightRadius={400}
        particleCount={12}
        glowColor="132, 0, 255"
        disableAnimations={false}
      >
        <MagicBentoItem className="md:col-span-4">
          <div className="p-6 flex flex-col gap-4 h-full">
            <div className="flex items-start justify-between gap-2 md:gap-4">
              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Welcome back</p>
                <h2 className="text-xl md:text-2xl font-semibold tracking-tight">{user.name}</h2>
                <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
              </div>
              <span className={cn("text-xs font-semibold capitalize px-3 py-1 rounded-full border mt-1 shrink-0", {
                "border-blue-500/30 bg-blue-500/10 text-blue-400": user.manual_mode === "auto",
                "border-purple-500/30 bg-purple-500/10 text-purple-400": user.manual_mode === "focus",
                "border-green-500/30 bg-green-500/10 text-green-400": user.manual_mode === "work",
                "border-yellow-500/30 bg-yellow-500/10 text-yellow-400": user.manual_mode === "meeting",
                "border-sky-500/30 bg-sky-500/10 text-sky-400": user.manual_mode === "relax",
                "border-slate-500/30 bg-slate-500/10 text-slate-400": user.manual_mode === "sleep",
              })}>
                {user.manual_mode}
              </span>
            </div>
            <button
              type="button"
              disabled={summarise.isPending}
              onClick={() => {
                setShowSummaryModal(true)
                setSummaryText(null)
                summarise.mutate(userId, {
                  onSuccess: (d) => setSummaryText(d.summary),
                  onError: () => setSummaryText({ headline: "Could not generate summary. Please try again.", stats: [], insights: [], tip: "" }),
                })
              }}
              className="self-start h-8 px-4 rounded-lg border border-violet-500/50 bg-violet-500/10 text-[11px] font-semibold text-violet-400 hover:bg-violet-500/20 hover:border-violet-400/70 transition-colors shadow-[0_0_10px_rgba(167,139,250,0.2)]"
            >
              ✦ Summarise today
            </button>
          </div>
        </MagicBentoItem>

        {[
          { label: "Delivered", value: delivered.length, color: "text-green-400", bg: "bg-green-400/10", extraClass: "md:row-span-2" },
          { label: "Queued", value: queued.length, color: "text-yellow-400", bg: "bg-yellow-400/10", extraClass: "" },
          { label: "Blocked", value: blocked.length, color: "text-red-400", bg: "bg-red-400/10", extraClass: "" },
        ].map(({ label, value, color, bg, extraClass }) => (
          <MagicBentoItem key={label} className={cn("md:col-span-2", extraClass)}>
            <div className={cn("h-full p-4 text-center flex flex-col justify-center", bg)}>
              <div className={cn("text-2xl font-semibold", color)}>{value}</div>
              <div className="text-[11px] text-muted-foreground mt-1">{label}</div>
            </div>
          </MagicBentoItem>
        ))}

        <MagicBentoItem className="md:col-span-6">
          <ModeSwitcher current={user.manual_mode} onSelect={handleMode} disabled={setMode.isPending} />
        </MagicBentoItem>

        <MagicBentoItem className="md:col-span-6">
          <AppSwitcher userId={userId} activeApp={user.active_app?.app_name ?? null} />
        </MagicBentoItem>

        <MagicBentoItem className="md:col-span-3 border-yellow-500/20">
          <div className="overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
              <p className="text-xs font-medium text-foreground">Queued</p>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-yellow-400/10 text-yellow-400 border border-yellow-400/20">
                {queued.length}
              </span>
            </div>
            <NotifList
              items={queued}
              emptyText="No queued notifications — all clear."
              accent="bg-yellow-400"
            />
          </div>
        </MagicBentoItem>

        <MagicBentoItem className="md:col-span-3 border-red-500/20">
          <div className="overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
              <p className="text-xs font-medium text-foreground">Blocked by AI</p>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-400/10 text-red-400 border border-red-400/20">
                {blocked.length}
              </span>
            </div>
            <NotifList
              items={blocked}
              emptyText="Nothing blocked yet."
              accent="bg-red-400"
            />
          </div>
        </MagicBentoItem>

        <MagicBentoItem className="md:col-span-6  border-green-500/20">
          <div className="overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
              <p className="text-xs font-medium text-foreground">Recently delivered</p>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-400/10 text-green-400 border border-green-400/20">
                {delivered.length}
              </span>
            </div>
            <NotifList
              items={delivered.slice(0, 8)}
              emptyText="No delivered notifications yet."
              accent="bg-green-400"
            />
          </div>
        </MagicBentoItem>
      </MagicBento>
    </div>

    {showSummaryModal && (
      <SummaryModal
        summary={summaryText}
        loading={summarise.isPending}
        onClose={() => { setShowSummaryModal(false); setSummaryText(null) }}
      />
    )}
  </>);
}
// ─── Connections tab ──────────────────────────────────────────────────────────

const INTEGRATIONS: { id: string; name: string; icon: IconType; description: string }[] = [
  { id: "browser_extension", name: "Browser Extension", icon: FaChrome,      description: "One-click setup for notification capture" },
  { id: "slack",    name: "Slack",    icon: FaSlack,          description: "Team messages and channel alerts" },
  { id: "gmail",    name: "Gmail",    icon: SiGmail,          description: "Email notifications and threads" },
  { id: "github",   name: "GitHub",   icon: FaGithub,         description: "PRs, issues and CI alerts" },
  { id: "calendar", name: "Calendar", icon: SiGooglecalendar, description: "Meeting and event reminders" },
  { id: "youtube",  name: "YouTube",  icon: FaYoutube,        description: "Subscriptions and live alerts" },
  { id: "telegram", name: "Telegram", icon: FaTelegramPlane,  description: "Bot alerts and direct messages" },
]

function TelegramConnectModal({ link, onClose }: { link: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-background text-foreground">
              <FaTelegramPlane className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-foreground">Connect Telegram</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Receive alerts via CogniShift Bot</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors shrink-0"
          >
            ✕
          </button>
        </div>

        {/* Steps */}
        <ol className="space-y-2.5">
          {[
            "Tap the button below to open Telegram.",
            "Press Start in the bot chat.",
            "Come back here — this page updates automatically.",
          ].map((step, i) => (
            <li key={step} className="flex items-start gap-2.5 text-xs text-muted-foreground">
              <span className="shrink-0 mt-px h-4 w-4 rounded-full bg-foreground/10 text-foreground text-[10px] font-semibold flex items-center justify-center">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>

        {/* CTA */}
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full h-10 rounded-xl bg-[#229ED9] text-white text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <FaTelegramPlane className="h-4 w-4" />
          Open in Telegram
        </a>
      </div>
    </div>
  )
}

function ConnectionsTab({ userId }: { userId: string }) {
  const { data: tg, isLoading: tgLoading } = useTelegramLink(userId)
  const { data: cal, isLoading: calLoading } = useCalendarCurrent(userId)
  const [showModal, setShowModal] = useState(false)
  const [extConfigured, setExtConfigured] = useState(false)
  const [extChecking, setExtChecking] = useState(true)
  const [extSaving, setExtSaving] = useState(false)
  const [extError, setExtError] = useState("")
  const [calConnecting, setCalConnecting] = useState(false)

  // Show a toast if returning from Google OAuth
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get("calendar_connected") === "true") {
      window.history.replaceState({}, "", window.location.pathname)
    }
  }, [])

  async function connectGoogleCalendar() {
    setCalConnecting(true)
    try {
      const { api } = await import("@/lib/api")
      const { auth_url } = await api.getCalendarAuthUrl(userId)
      window.location.href = auth_url
    } catch {
      setCalConnecting(false)
    }
  }

  function pingExtension() {
    setExtChecking(true)

    const timeoutId = window.setTimeout(() => {
      setExtChecking(false)
      setExtConfigured(false)
    }, 1200)

    const onMessage = (event: MessageEvent) => {
      if (event.source !== window || !event.data || event.data.type !== "COGNISHIFT_EXTENSION_PONG") {
        return
      }

      window.clearTimeout(timeoutId)
      setExtChecking(false)
      setExtConfigured(Boolean(event.data.configured))
      window.removeEventListener("message", onMessage)
    }

    window.addEventListener("message", onMessage)
    window.postMessage({ type: "COGNISHIFT_PING_EXTENSION" }, "*")
  }

  useEffect(() => {
    pingExtension()
  }, [])

  function connectExtension() {
    setExtError("")
    setExtSaving(true)

    const timeoutId = window.setTimeout(() => {
      setExtSaving(false)
      setExtConfigured(false)
      setExtError("Extension not detected. Reload extension and refresh this page.")
    }, 1800)

    const onMessage = (event: MessageEvent) => {
      if (event.source !== window || !event.data || event.data.type !== "COGNISHIFT_EXTENSION_CONFIG_RESULT") {
        return
      }

      window.clearTimeout(timeoutId)
      setExtSaving(false)
      setExtConfigured(Boolean(event.data.ok && event.data.configured))
      if (!event.data.ok) {
        setExtError(event.data.error || "Configuration failed.")
      }
      window.removeEventListener("message", onMessage)
    }

    window.addEventListener("message", onMessage)
    window.postMessage(
      {
        type: "COGNISHIFT_CONFIGURE_EXTENSION",
        payload: {
          user_id: userId,
          api_base: getApiBaseUrl(),
          monitored_apps: ["gmail", "slack", "github", "calendar", "youtube"],
        },
      },
      "*"
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-8 px-4">
      <div>
        <h2 className="text-base font-semibold tracking-tight">Connected apps</h2>
        <p className="text-xs text-muted-foreground mt-1">
          These are the sources CogniShift can receive notifications from.
        </p>
      </div>

      <div className="space-y-2">
        {INTEGRATIONS.map((app) => {
          const AppIcon = app.icon
          const isBrowserExtension = app.id === "browser_extension"
          const isTelegram   = app.id === "telegram"
          const isCalendar   = app.id === "calendar"
          const isConnected  = isTelegram ? (tg?.linked ?? false)
                             : isCalendar ? (cal?.connected ?? false)
                             : false

          return (
            <div
              key={app.id}
              className="flex items-center gap-4 rounded-xl border border-border bg-card px-5 py-4"
            >
              <span className="shrink-0 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-background text-foreground">
                <AppIcon className="h-5 w-5" />
              </span>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{app.name}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{app.description}</p>
                {isTelegram && isConnected && tg?.chat_id && (
                  <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">
                    Chat ID: {tg.chat_id}
                  </p>
                )}
                {isCalendar && isConnected && cal?.event && (
                  <p className="text-[11px] text-green-400 mt-0.5">
                    Now: {cal.event.current_event}
                  </p>
                )}
                {isBrowserExtension && (
                  <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">
                    user_id: {userId}
                  </p>
                )}
              </div>

              <div className="shrink-0 flex items-center gap-2">
                {isBrowserExtension ? (
                  extChecking ? (
                    <span className="text-[10px] text-muted-foreground">Checking…</span>
                  ) : extConfigured ? (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border border-green-500/30 bg-green-500/10 text-green-400">
                      Connected
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={connectExtension}
                      disabled={extSaving}
                      className="h-7 px-3 rounded-lg border border-border bg-background text-[11px] font-medium text-foreground hover:bg-muted/40 transition-colors disabled:opacity-50"
                    >
                      {extSaving ? "Connecting…" : "One-click Connect"}
                    </button>
                  )
                ) : isTelegram ? (
                  tgLoading ? (
                    <span className="text-[10px] text-muted-foreground">Checking…</span>
                  ) : isConnected ? (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border border-green-500/30 bg-green-500/10 text-green-400">
                      Connected
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowModal(true)}
                      className="h-7 px-3 rounded-lg border border-border bg-background text-[11px] font-medium text-foreground hover:bg-muted/40 transition-colors"
                    >
                      Connect →
                    </button>
                  )
                ) : isCalendar ? (
                  calLoading ? (
                    <span className="text-[10px] text-muted-foreground">Checking…</span>
                  ) : isConnected ? (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border border-green-500/30 bg-green-500/10 text-green-400">
                      Connected
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={connectGoogleCalendar}
                      disabled={calConnecting}
                      className="h-7 px-3 rounded-lg border border-border bg-background text-[11px] font-medium text-foreground hover:bg-muted/40 transition-colors disabled:opacity-50"
                    >
                      {calConnecting ? "Redirecting…" : "Connect →"}
                    </button>
                  )
                ) : (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border border-border bg-muted/30 text-muted-foreground">
                    Not connected
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {extError && (
        <p className="text-xs text-red-400">{extError}</p>
      )}

      {showModal && tg?.link && (
        <TelegramConnectModal link={tg.link} onClose={() => setShowModal(false)} />
      )}
    </div>
  )
}
// ─── Chart helpers ────────────────────────────────────────────────────────────

const CHART_TOOLTIP_STYLE = {
  contentStyle: { background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 },
  itemStyle:    { color: "hsl(var(--foreground))" },
  labelStyle:   { color: "hsl(var(--muted-foreground))" },
}

const STATUS_PALETTE  = { delivered: "#4ade80", queued: "#facc15", blocked: "#f87171", pending: "#94a3b8" }
const PRIORITY_PALETTE = { high: "#f87171", medium: "#facc15", low: "#60a5fa" }
const SOURCE_PALETTE   = ["#818cf8", "#34d399", "#fb923c", "#f472b6", "#38bdf8", "#a78bfa"]

// ─── Dashboard tab ────────────────────────────────────────────────────────────

function DashboardTab({ userId }: { userId: string }) {
  const { data: notifications } = useUserNotifications(userId)

  const total     = notifications?.length ?? 0
  const delivered = notifications?.filter((n) => n.status === "sent" || n.status === "delivered").length ?? 0
  const blocked   = notifications?.filter((n) => n.status === "blocked").length ?? 0
  const queued    = notifications?.filter((n) => n.status === "queued").length ?? 0
  const pending   = notifications?.filter((n) => n.status === "pending").length ?? 0
  const highBlocked = notifications?.filter((n) => n.status === "blocked" && n.ai_priority === "high").length ?? 0

  // Delivery rate
  const deliveryRate = total ? Math.round((delivered / total) * 100) : 0
  const blockRate    = total ? Math.round((blocked  / total) * 100) : 0

  // Time saved: each blocked/queued notification = ~2.5 min of context-switch cost
  const timeSavedMin = (blocked + queued) * 2.5
  const timeSavedLabel = timeSavedMin >= 60
    ? `${Math.floor(timeSavedMin / 60)}h ${Math.round(timeSavedMin % 60)}m`
    : `${Math.round(timeSavedMin)}m`

  // Focus sessions protected: each blocked notification during likely focus = ~25 min pomodoro saved
  const focusProtected = Math.floor(blocked * 0.6) // assume 60% blocked during focus-like modes

  // Donut — decision distribution
  const decisionData = [
    { name: "Delivered", value: delivered, fill: STATUS_PALETTE.delivered },
    { name: "Queued",    value: queued,    fill: STATUS_PALETTE.queued    },
    { name: "Blocked",   value: blocked,   fill: STATUS_PALETTE.blocked   },
    { name: "Pending",   value: pending,   fill: STATUS_PALETTE.pending   },
  ].filter((d) => d.value > 0)

  // Bar — by source
  const sourceMap: Record<string, number> = {}
  notifications?.forEach((n) => {
    sourceMap[n.source_app] = (sourceMap[n.source_app] ?? 0) + 1
  })
  const sourceData = Object.entries(sourceMap)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }))

  // Bar — by priority
  const priorityMap: Record<string, number> = { high: 0, medium: 0, low: 0 }
  notifications?.forEach((n) => {
    if (n.ai_priority) priorityMap[n.ai_priority] = (priorityMap[n.ai_priority] ?? 0) + 1
  })
  const priorityData = Object.entries(priorityMap).map(([name, count]) => ({ name, count }))

  // Radial — delivery vs block rate
  const radialData = [
    { name: "Delivery rate", value: deliveryRate, fill: STATUS_PALETTE.delivered },
    { name: "Block rate",    value: blockRate,    fill: STATUS_PALETTE.blocked   },
  ]

  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-2">
        <p className="text-sm text-muted-foreground">No notification data yet.</p>
        <p className="text-xs text-muted-foreground">Charts will appear once notifications are processed.</p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 md:px-6">
      <MagicBento
        textAutoHide={true}
        enableStars
        enableSpotlight
        enableBorderGlow={true}
        enableTilt={false}
        enableMagnetism={false}
        clickEffect
        spotlightRadius={400}
        particleCount={12}
        glowColor="132, 0, 255"
        disableAnimations={false}
      >
        {[
          { label: "Time saved", value: timeSavedLabel, tone: "text-green-400", note: `from ${blocked + queued} interruptions avoided` },
          { label: "Useless notifications blocked", value: blocked, tone: "text-red-400", note: `${blockRate}% of all incoming filtered out` },
          { label: "Focus sessions protected", value: focusProtected, tone: "text-purple-400", note: "estimated deep-work blocks kept intact" },
          { label: "High-priority blocked", value: highBlocked, tone: "text-orange-400", note: "urgent alerts suppressed by AI context" },
          { label: "Delivery rate", value: `${deliveryRate}%`, tone: "text-blue-400", note: `${delivered} of ${total} notifications sent through` },
          { label: "Waiting in queue", value: queued, tone: "text-yellow-400", note: "held - will deliver when mode allows" },
        ].map((card) => (
          <MagicBentoItem key={card.label} className="md:col-span-2">
            <div className="p-5 space-y-1 h-full">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wide">{card.label}</p>
              <p className={cn("text-3xl font-semibold tabular-nums", card.tone)}>{card.value}</p>
              <p className="text-[11px] text-muted-foreground">{card.note}</p>
            </div>
          </MagicBentoItem>
        ))}

        <MagicBentoItem className="md:col-span-3">
          <div className="p-5">
            <p className="text-xs font-medium text-foreground mb-4">Decision distribution</p>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={decisionData} cx="50%" cy="50%" innerRadius={55} outerRadius={80}
                  paddingAngle={3} dataKey="value">
                  {decisionData.map((d) => <Cell key={d.name} fill={d.fill} />)}
                </Pie>
                <Tooltip {...CHART_TOOLTIP_STYLE} />
                <Legend iconType="circle" iconSize={8}
                  formatter={(v) => <span style={{ fontSize: 11, color: "hsl(var(--foreground))" }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </MagicBentoItem>

        <MagicBentoItem className="md:col-span-3">
          <div className="p-5">
            <p className="text-xs font-medium text-foreground mb-4">Delivery vs block rate</p>
            <ResponsiveContainer width="100%" height={200}>
              <RadialBarChart cx="50%" cy="50%" innerRadius={30} outerRadius={90}
                data={radialData} startAngle={90} endAngle={-270}>
                <RadialBar dataKey="value" cornerRadius={6} label={{ position: "insideStart", fill: "#fff", fontSize: 10 }} />
                <Legend iconType="circle" iconSize={8}
                  formatter={(v) => <span style={{ fontSize: 11, color: "hsl(var(--foreground))" }}>{v}</span>} />
                <Tooltip {...CHART_TOOLTIP_STYLE} formatter={(v) => `${v}%`} />
              </RadialBarChart>
            </ResponsiveContainer>
          </div>
        </MagicBentoItem>

        {sourceData.length > 0 && (
          <MagicBentoItem className="md:col-span-6">
            <div className="p-5">
              <p className="text-xs font-medium text-foreground mb-4">Notifications by source</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={sourceData} margin={{ top: 0, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip {...CHART_TOOLTIP_STYLE} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {sourceData.map((_, i) => <Cell key={i} fill={SOURCE_PALETTE[i % SOURCE_PALETTE.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </MagicBentoItem>
        )}

        <MagicBentoItem className="md:col-span-6">
          <div className="p-5">
            <p className="text-xs font-medium text-foreground mb-4">Priority breakdown</p>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={priorityData} layout="vertical" margin={{ top: 0, right: 24, left: 12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={52} />
                <Tooltip {...CHART_TOOLTIP_STYLE} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {priorityData.map((d) => (
                    <Cell key={d.name} fill={PRIORITY_PALETTE[d.name as keyof typeof PRIORITY_PALETTE] ?? "#94a3b8"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </MagicBentoItem>
      </MagicBento>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

type Tab = "home" | "connections" | "dashboard"

const NAV_ITEMS = [
  { label: "Home",        href: "home" },
  { label: "Dashboard",   href: "dashboard" },
    { label: "Connections", href: "connections" },
]

const MOBILE_NAV_ITEMS: InteractiveMenuItem[] = [
  { label: "home", icon: Home },
  { label: "dashboard", icon: BarChart3 },
    { label: "connections", icon: Link2 },
]

export default function UserDashboard() {
  const navigate  = useNavigate()
  const user      = auth.getUser()
  const [tab, setTab] = useState<Tab>("home")

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-sm text-muted-foreground">You need to be signed in to view this page.</p>
        <button
          onClick={() => navigate("/login")}
          className="h-9 px-5 bg-foreground text-background rounded-lg text-xs font-medium hover:opacity-90 transition-all"
        >
          Sign in
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Floating navbar */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-40 w-full max-w-5xl px-4 hidden md:block">
        <div className="flex justify-center overflow-x-auto">
          <PillNav
            brandText="Cognishift"
            items={NAV_ITEMS}
            activeHref={tab}
            onNavigate={(href) => setTab(href as Tab)}
            actionLabel="Sign out"
            onActionClick={() => { auth.clear(); navigate("/login") }}
            theme="light"
            baseColor="hsl(var(--card) / 0.95)"
            pillColor="hsl(var(--foreground))"
            pillTextColor="hsl(var(--background))"
            className="border border-border shadow-lg backdrop-blur"
          />
        </div>
      </div>

      {/* Mobile navbar */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-full px-4 md:hidden">
        <div className="flex justify-center">
          <InteractiveMenu
            items={MOBILE_NAV_ITEMS}
            activeIndex={Math.max(0, NAV_ITEMS.findIndex((item) => item.href === tab))}
            onItemSelect={(_, index) => {
              const next = NAV_ITEMS[index]
              if (next) setTab(next.href as Tab)
            }}
            accentColor="hsl(var(--foreground))"
          />
        </div>
      </div>

      {/* Tab content */}
      <div className="pt-6 md:pt-24 pb-24 md:pb-8">
        {tab === "home"        && <HomeTab        userId={user.user_id} />}
        {tab === "connections" && <ConnectionsTab userId={user.user_id} />}
        {tab === "dashboard"   && <DashboardTab   userId={user.user_id} />}
      </div>
    </div>
  )
}
