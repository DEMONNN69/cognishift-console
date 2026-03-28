"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { cn } from "@/lib/utils"
import PillNav from "@/components/PillNav"
import { auth } from "@/lib/auth"
import { useUsers, useUserNotifications, useSetMode, useTelegramLink } from "@/hooks/use-api"
import type { ManualMode } from "@/types/api"
import type { IconType } from "react-icons"
import { FaSlack, FaGithub, FaYoutube, FaTelegramPlane, FaPuzzlePiece } from "react-icons/fa"
import { SiGmail, SiGooglecalendar } from "react-icons/si"
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

const MODES: { value: ManualMode; label: string; description: string }[] = [
  { value: "auto",    label: "Auto",    description: "AI decides" },
  { value: "focus",   label: "Focus",   description: "Deep work" },
  { value: "work",    label: "Work",    description: "Office" },
  { value: "meeting", label: "Meeting", description: "In a call" },
  { value: "relax",   label: "Relax",   description: "Free time" },
  { value: "sleep",   label: "Sleep",   description: "Do not disturb" },
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
          <span className="text-[10px] text-muted-foreground shrink-0 tabular-nums">
            {new Date(n.triggered_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        </li>
      ))}
    </ul>
  )
}

// ─── Home tab ─────────────────────────────────────────────────────────────────

function HomeTab({ userId }: { userId: string }) {
  const { data: users } = useUsers()
  const user = users?.find((u) => u.id === userId)
  const { data: notifications } = useUserNotifications(userId)
  const setMode = useSetMode()

  const delivered = notifications?.filter((n) => n.status === "sent" || n.status === "delivered") ?? []
  const queued    = notifications?.filter((n) => n.status === "queued") ?? []
  const blocked   = notifications?.filter((n) => n.status === "blocked") ?? []

  function handleMode(mode: ManualMode) {
    setMode.mutate({ userId, mode })
  }

  if (!user) {
    return <div className="flex items-center justify-center py-24 text-sm text-muted-foreground">Loading…</div>
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-8 px-4">

      {/* Welcome + mode badge */}
      <div className="rounded-xl border border-border bg-card p-6 flex items-start justify-between gap-4">
        <div className="space-y-0.5">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Welcome back</p>
          <h2 className="text-2xl font-semibold tracking-tight">{user.name}</h2>
          <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
        </div>
        <span className={cn("text-xs font-semibold capitalize px-3 py-1 rounded-full border mt-1", {
          "border-blue-500/30 bg-blue-500/10 text-blue-400":     user.manual_mode === "auto",
          "border-purple-500/30 bg-purple-500/10 text-purple-400": user.manual_mode === "focus",
          "border-green-500/30 bg-green-500/10 text-green-400":   user.manual_mode === "work",
          "border-yellow-500/30 bg-yellow-500/10 text-yellow-400": user.manual_mode === "meeting",
          "border-sky-500/30 bg-sky-500/10 text-sky-400":         user.manual_mode === "relax",
          "border-slate-500/30 bg-slate-500/10 text-slate-400":   user.manual_mode === "sleep",
        })}>
          {user.manual_mode}
        </span>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Delivered", value: delivered.length, color: "text-green-400",  bg: "bg-green-400/10"  },
          { label: "Queued",    value: queued.length,    color: "text-yellow-400", bg: "bg-yellow-400/10" },
          { label: "Blocked",   value: blocked.length,   color: "text-red-400",    bg: "bg-red-400/10"    },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={cn("rounded-xl border border-border p-4 text-center", bg)}>
            <div className={cn("text-2xl font-semibold", color)}>{value}</div>
            <div className="text-[11px] text-muted-foreground mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* Mode switcher */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <p className="text-xs font-medium text-foreground">Switch mode</p>
        <div className="grid grid-cols-3 gap-2">
          {MODES.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => handleMode(m.value)}
              disabled={setMode.isPending}
              className={cn(
                "p-2.5 rounded-lg border text-xs text-left transition-all",
                user.manual_mode === m.value
                  ? "border-foreground bg-foreground/5"
                  : "border-border bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground"
              )}
            >
              <div className={cn("font-semibold mb-0.5", MODE_COLORS[m.value])}>{m.label}</div>
              <div className="text-[10px] text-muted-foreground leading-tight">{m.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Queued notifications */}
      <div className="rounded-xl border border-yellow-500/20 bg-card overflow-hidden">
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

      {/* Blocked notifications */}
      <div className="rounded-xl border border-red-500/20 bg-card overflow-hidden">
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

      {/* Recently delivered */}
      <div className="rounded-xl border border-green-500/20 bg-card overflow-hidden">
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

    </div>
  )
}

// ─── Connections tab ──────────────────────────────────────────────────────────

const INTEGRATIONS: { id: string; name: string; icon: IconType; description: string }[] = [
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

type ExtState = "detecting" | "not-installed" | "ready" | "configured" | "error"

function useExtension(_userId: string) {
  const [state, setState] = useState<ExtState>("detecting")

  function configure() {
    window.postMessage({ type: "__COGNISHIFT_CONFIGURE__" }, window.location.origin)
  }

  useEffect(() => {
    let settled = false

    function onReady() {
      if (settled) return
      settled = true
      clearTimeout(fallbackTimer)
      setState("ready")
    }
    function onConfigured() { setState("configured") }
    function onError()      { setState("error") }

    document.addEventListener("cognishift-ready",        onReady)
    document.addEventListener("cognishift-configured",   onConfigured)
    document.addEventListener("cognishift-config-error", onError)

    // Small delay so listeners are registered before the ping fires
    const pingTimer = setTimeout(() => {
      window.postMessage({ type: "__COGNISHIFT_PING__" }, window.location.origin)
    }, 50)

    // Give the extension 1.5 s to reply before marking not-installed
    const fallbackTimer = setTimeout(() => {
      if (!settled) setState("not-installed")
    }, 1500)

    return () => {
      clearTimeout(pingTimer)
      clearTimeout(fallbackTimer)
      document.removeEventListener("cognishift-ready",        onReady)
      document.removeEventListener("cognishift-configured",   onConfigured)
      document.removeEventListener("cognishift-config-error", onError)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { state, configure }
}

function ConnectionsTab({ userId }: { userId: string }) {
  const { data: tg, isLoading: tgLoading } = useTelegramLink(userId)
  const [showModal, setShowModal] = useState(false)
  const { state: extState, configure } = useExtension(userId)

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-8 px-4">
      <div>
        <h2 className="text-base font-semibold tracking-tight">Connected apps</h2>
        <p className="text-xs text-muted-foreground mt-1">
          These are the sources CogniShift can receive notifications from.
        </p>
      </div>

      <div className="space-y-2">
        {/* ── Browser Extension card ── */}
        <div className="flex items-center gap-4 rounded-xl border border-border bg-card px-5 py-4">
          <span className="shrink-0 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-background text-foreground">
            <FaPuzzlePiece className="h-5 w-5" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">Browser Extension</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Captures notifications from Gmail, Slack, GitHub and more
            </p>
            {extState === "configured" && (
              <p className="text-[11px] text-green-400 mt-0.5">
                Extension is linked to your account ✓
              </p>
            )}
            {extState === "not-installed" && (
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Load the extension in Chrome → chrome://extensions → Developer mode → Load unpacked
              </p>
            )}
          </div>
          <div className="shrink-0">
            {extState === "detecting" && (
              <span className="text-[10px] text-muted-foreground">Detecting…</span>
            )}
            {extState === "not-installed" && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border border-border bg-muted/30 text-muted-foreground">
                Not installed
              </span>
            )}
            {extState === "configured" && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border border-green-500/30 bg-green-500/10 text-green-400">
                Configured
              </span>
            )}
            {extState === "error" && (
              <button
                type="button"
                onClick={configure}
                className="h-7 px-3 rounded-lg border border-red-500/30 bg-red-500/10 text-[11px] font-medium text-red-400 hover:opacity-90 transition-opacity"
              >
                Configure
              </button>
            )}
            {extState === "ready" && (
              <button
                type="button"
                onClick={configure}
                className="h-7 px-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 text-[11px] font-medium text-yellow-400 hover:opacity-90 transition-opacity"
              >
                Configure
              </button>
            )}
          </div>
        </div>

        {/* ── Other integrations ── */}
        {INTEGRATIONS.map((app) => {
          const AppIcon     = app.icon
          const isTelegram  = app.id === "telegram"
          const isConnected = isTelegram ? (tg?.linked ?? false) : false

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
              </div>
              <div className="shrink-0">
                {isTelegram ? (
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
    <div className="max-w-3xl mx-auto space-y-6 py-8 px-4">

      {/* Impact KPI cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-border bg-card p-5 space-y-1">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Time saved</p>
          <p className="text-3xl font-semibold tabular-nums text-green-400">{timeSavedLabel}</p>
          <p className="text-[11px] text-muted-foreground">from {blocked + queued} interruptions avoided</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 space-y-1">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Useless notifications blocked</p>
          <p className="text-3xl font-semibold tabular-nums text-red-400">{blocked}</p>
          <p className="text-[11px] text-muted-foreground">{blockRate}% of all incoming filtered out</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 space-y-1">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Focus sessions protected</p>
          <p className="text-3xl font-semibold tabular-nums text-purple-400">{focusProtected}</p>
          <p className="text-[11px] text-muted-foreground">estimated deep-work blocks kept intact</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 space-y-1">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide">High-priority blocked</p>
          <p className="text-3xl font-semibold tabular-nums text-orange-400">{highBlocked}</p>
          <p className="text-[11px] text-muted-foreground">urgent alerts suppressed by AI context</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 space-y-1">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Delivery rate</p>
          <p className="text-3xl font-semibold tabular-nums text-blue-400">{deliveryRate}%</p>
          <p className="text-[11px] text-muted-foreground">{delivered} of {total} notifications sent through</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 space-y-1">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Waiting in queue</p>
          <p className="text-3xl font-semibold tabular-nums text-yellow-400">{queued}</p>
          <p className="text-[11px] text-muted-foreground">held — will deliver when mode allows</p>
        </div>
      </div>

      {/* Row: Donut + Radial */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* Decision distribution donut */}
        <div className="rounded-xl border border-border bg-card p-5">
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

        {/* Delivery vs block radial */}
        <div className="rounded-xl border border-border bg-card p-5">
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
      </div>

      {/* Notifications by source bar */}
      {sourceData.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5">
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
      )}

      {/* Priority breakdown bar */}
      <div className="rounded-xl border border-border bg-card p-5">
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

    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

type Tab = "home" | "connections" | "dashboard"

const NAV_ITEMS = [
  { label: "Home",        href: "home" },
  { label: "Connections", href: "connections" },
  { label: "Dashboard",   href: "dashboard" },
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
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-40 w-full max-w-5xl px-4">
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

      {/* Tab content */}
      <div className="pt-24">
        {tab === "home"        && <HomeTab        userId={user.user_id} />}
        {tab === "connections" && <ConnectionsTab userId={user.user_id} />}
        {tab === "dashboard"   && <DashboardTab   userId={user.user_id} />}
      </div>
    </div>
  )
}
