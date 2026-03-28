"use client"

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { cn } from "@/lib/utils"
import PillNav from "@/components/PillNav"
import { auth } from "@/lib/auth"
import { useUsers, useUserNotifications, useSetMode, useTelegramLink } from "@/hooks/use-api"
import type { ManualMode } from "@/types/api"
import type { IconType } from "react-icons"
import { FaSlack, FaGithub, FaYoutube, FaTelegramPlane } from "react-icons/fa"
import { SiGmail, SiGooglecalendar } from "react-icons/si"

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

const DECISION_COLORS: Record<string, string> = {
  send: "text-green-400", delay: "text-yellow-400", block: "text-red-400",
}

const PRIORITY_COLORS: Record<string, string> = {
  high: "text-red-400", medium: "text-yellow-400", low: "text-blue-400",
}

// ─── Home tab ─────────────────────────────────────────────────────────────────

function HomeTab({ userId }: { userId: string }) {
  const { data: users } = useUsers()
  const user = users?.find((u) => u.id === userId)
  const { data: notifications } = useUserNotifications(userId)
  const setMode = useSetMode()

  const recent = notifications?.slice(0, 5) ?? []
  const sent    = notifications?.filter((n) => n.status === "sent" || n.status === "delivered").length ?? 0
  const blocked = notifications?.filter((n) => n.status === "blocked").length ?? 0
  const queued  = notifications?.filter((n) => n.status === "queued").length ?? 0

  function handleMode(mode: ManualMode) {
    setMode.mutate({ userId, mode })
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center py-24 text-sm text-muted-foreground">
        Loading…
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-8 px-4">
      {/* Welcome card */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-1">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">Welcome back</p>
        <h2 className="text-2xl font-semibold tracking-tight">{user.name}</h2>
        <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Delivered", value: sent,    color: "text-green-400" },
          { label: "Queued",    value: queued,  color: "text-yellow-400" },
          { label: "Blocked",   value: blocked, color: "text-red-400" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl border border-border bg-card p-4 text-center">
            <div className={cn("text-2xl font-semibold", color)}>{value}</div>
            <div className="text-[11px] text-muted-foreground mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* Current mode + switcher */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-foreground">Current mode</p>
          <span className={cn("text-xs font-semibold capitalize", MODE_COLORS[user.manual_mode])}>
            {user.manual_mode}
          </span>
        </div>
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

      {/* Recent notifications */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border">
          <p className="text-xs font-medium text-foreground">Recent notifications</p>
        </div>
        {recent.length === 0 ? (
          <div className="py-10 text-center text-xs text-muted-foreground">No notifications yet.</div>
        ) : (
          <ul className="divide-y divide-border">
            {recent.map((n) => (
              <li key={n.id} className="flex items-start gap-3 px-5 py-3">
                <span className="text-base mt-0.5">{SOURCE_ICONS[n.source_app] ?? "🔔"}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-foreground truncate">{n.message}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 capitalize">{n.source_app}</p>
                </div>
                <span className={cn("text-[11px] font-medium capitalize shrink-0", DECISION_COLORS[n.status] ?? "text-muted-foreground")}>
                  {n.status}
                </span>
              </li>
            ))}
          </ul>
        )}
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

function ConnectionsTab({ userId }: { userId: string }) {
  const { data: tg, isLoading: tgLoading } = useTelegramLink(userId)
  const [showModal, setShowModal] = useState(false)

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
          const isTelegram   = app.id === "telegram"
          const isConnected  = isTelegram ? (tg?.linked ?? false) : false

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

              <div className="shrink-0 flex items-center gap-2">
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

// ─── Dashboard tab ────────────────────────────────────────────────────────────

function DashboardTab({ userId }: { userId: string }) {
  const { data: notifications } = useUserNotifications(userId)

  const total   = notifications?.length ?? 0
  const sent    = notifications?.filter((n) => n.status === "sent" || n.status === "delivered").length ?? 0
  const blocked = notifications?.filter((n) => n.status === "blocked").length ?? 0
  const queued  = notifications?.filter((n) => n.status === "queued").length ?? 0

  const bySource: Record<string, number> = {}
  const byPriority: Record<string, number> = { high: 0, medium: 0, low: 0 }

  notifications?.forEach((n) => {
    bySource[n.source_app] = (bySource[n.source_app] ?? 0) + 1
    if (n.ai_priority) byPriority[n.ai_priority] = (byPriority[n.ai_priority] ?? 0) + 1
  })

  const sourceEntries = Object.entries(bySource).sort((a, b) => b[1] - a[1])

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-8 px-4">
      <div>
        <h2 className="text-base font-semibold tracking-tight">Your notification analytics</h2>
        <p className="text-xs text-muted-foreground mt-1">All-time stats for your account.</p>
      </div>

      {/* Summary grid */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Total received",  value: total,   color: "text-foreground" },
          { label: "Delivered",       value: sent,    color: "text-green-400" },
          { label: "Blocked by AI",   value: blocked, color: "text-red-400" },
          { label: "Waiting (queue)", value: queued,  color: "text-yellow-400" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl border border-border bg-card p-5">
            <div className={cn("text-3xl font-semibold", color)}>{value}</div>
            <div className="text-xs text-muted-foreground mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* Priority breakdown */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border">
          <p className="text-xs font-medium text-foreground">Priority breakdown</p>
        </div>
        <div className="divide-y divide-border">
          {Object.entries(byPriority).map(([priority, count]) => (
            <div key={priority} className="flex items-center gap-3 px-5 py-3">
              <span className={cn("text-xs font-semibold capitalize w-16", PRIORITY_COLORS[priority])}>
                {priority}
              </span>
              <div className="flex-1 h-1.5 rounded-full bg-muted/40 overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all", {
                    "bg-red-400":    priority === "high",
                    "bg-yellow-400": priority === "medium",
                    "bg-blue-400":   priority === "low",
                  })}
                  style={{ width: total ? `${(count / total) * 100}%` : "0%" }}
                />
              </div>
              <span className="text-xs text-muted-foreground w-6 text-right">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* By source */}
      {sourceEntries.length > 0 && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border">
            <p className="text-xs font-medium text-foreground">By source app</p>
          </div>
          <ul className="divide-y divide-border">
            {sourceEntries.map(([source, count]) => (
              <li key={source} className="flex items-center gap-3 px-5 py-3">
                <span className="text-base">{SOURCE_ICONS[source] ?? "🔔"}</span>
                <span className="flex-1 text-xs text-foreground capitalize">{source}</span>
                <span className="text-xs font-semibold text-foreground">{count}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
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
