"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { cn } from "@/lib/utils"
import { CheckIcon, ArrowRightIcon } from "lucide-react"
import { useCreateUser, useSendOtp, useVerifyOtp } from "@/hooks/use-api"
import type { Role, NotificationPref, ManualMode } from "@/types/api"

// ─── Static data ──────────────────────────────────────────────────────────────

const ROLES: { value: Role; label: string; icon: string; description: string }[] = [
  { value: "developer", label: "Developer", icon: "⌨️", description: "I build things and need deep focus time" },
  { value: "manager",   label: "Manager",   icon: "📋", description: "I coordinate teams and run back-to-back meetings" },
  { value: "student",   label: "Student",   icon: "📚", description: "I study, attend lectures, and take breaks" },
  { value: "designer",  label: "Designer",  icon: "🎨", description: "I do long creative sessions in design tools" },
]

const NOTIF_PREFS: { value: NotificationPref; label: string; description: string }[] = [
  { value: "all",         label: "All",           description: "Receive every notification" },
  { value: "priority",    label: "Priority only",  description: "Only medium and high priority" },
  { value: "urgent_only", label: "Urgent only",    description: "Only notifications marked urgent" },
]

const MODES: { value: ManualMode; label: string; description: string; color: string }[] = [
  { value: "auto",    label: "Auto",    description: "AI infers my mode from context",  color: "text-blue-400" },
  { value: "focus",   label: "Focus",   description: "Deep work — minimise all noise",  color: "text-purple-400" },
  { value: "work",    label: "Work",    description: "General office activity",          color: "text-green-400" },
  { value: "meeting", label: "Meeting", description: "I'm in a call or meeting",         color: "text-yellow-400" },
  { value: "relax",   label: "Relax",   description: "Free time — show me everything",  color: "text-sky-400" },
  { value: "sleep",   label: "Sleep",   description: "Do not disturb",                  color: "text-slate-400" },
]

const PERSONA_HINTS: Record<Role, string[]> = {
  developer: ["Do you prefer uninterrupted coding blocks?", "Which tools do you use most — VS Code, terminal, Slack?", "How often do you check notifications?"],
  manager:   ["How many meetings do you have per day?", "Do you need to be reachable at all times?", "How do you handle urgent notifications during meetings?"],
  student:   ["Do you have scheduled lecture times?", "Do you tend to study late at night?", "How easily are you distracted?"],
  designer:  ["Do you prefer long uninterrupted Figma sessions?", "How often do you collaborate vs. work solo?", "Are design review notifications high priority?"],
}

const STEP_LABELS = ["Phone", "Profile", "Preferences", "Persona"]
const TOTAL = STEP_LABELS.length

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepIndicator({ current, total }: Readonly<{ current: number; total: number }>) {
  return (
    <div className="flex items-center justify-center gap-3 mb-8">
      {STEP_LABELS.slice(0, total).map((label, i) => (
        <div key={label} className="flex items-center gap-3">
          <div className={cn(
            "relative flex h-9 w-9 items-center justify-center rounded-full text-sm font-medium transition-all duration-700",
            i < current  && "bg-foreground/10 text-foreground/60",
            i === current && "bg-foreground text-background shadow-[0_0_20px_-5px_rgba(0,0,0,0.3)]",
            i > current  && "bg-muted/50 text-muted-foreground/40",
          )}>
            {i < current
              ? <CheckIcon className="h-4 w-4" strokeWidth={2.5} />
              : <span>{i + 1}</span>
            }
            {i === current && (
              <div className="absolute inset-0 rounded-full bg-foreground/20 blur-md animate-pulse" />
            )}
          </div>
          {i < total - 1 && (
            <div className="relative h-[1.5px] w-10">
              <div className="absolute inset-0 bg-border/40" />
              <div
                className="absolute inset-0 bg-foreground/30 transition-all duration-700 origin-left"
                style={{ transform: `scaleX(${i < current ? 1 : 0})` }}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Step 1 — Phone + OTP ─────────────────────────────────────────────────────

interface StepPhoneProps {
  readonly phone: string
  readonly setPhone: (v: string) => void
  readonly onVerified: () => void
}

function StepPhone({ phone, setPhone, onVerified }: StepPhoneProps) {
  const [otpSent, setOtpSent] = useState(false)
  const [otp, setOtp] = useState("")
  const [error, setError] = useState("")
  const sendOtp = useSendOtp()
  const verifyOtp = useVerifyOtp()

  function handleSend() {
    setError("")
    if (!phone.trim()) { setError("Enter your phone number first."); return }
    if (!/^\d{10,15}$/.test(phone.trim())) { setError("Enter a valid phone number (10–15 digits, no spaces or symbols)."); return }
    sendOtp.mutate({ phone: phone.trim() }, {
      onSuccess: () => setOtpSent(true),
      onError: (e) => setError((e as Error).message),
    })
  }

  function handleVerify() {
    setError("")
    if (!otp.trim()) { setError("Enter the OTP you received."); return }
    verifyOtp.mutate({ phone: phone.trim(), otp: otp.trim() }, {
      onSuccess: () => onVerified(),
      onError: (e) => setError((e as Error).message),
    })
  }

  function getSendLabel() {
    if (sendOtp.isPending) return "Sending…"
    if (otpSent) return "Resend"
    return "Send OTP"
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Verify your phone</h2>
        <p className="text-xs text-muted-foreground mt-1">We'll send a one-time password to confirm your number.</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="phone-input" className="text-xs font-medium text-foreground">Phone number</label>
          <div className="flex gap-2">
            <input
              id="phone-input"
              className="flex-1 h-10 px-3 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring"
              placeholder="+91 9876543210"
              value={phone}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, "").slice(0, 15)
                setPhone(digits); setOtpSent(false); setOtp(""); setError("")
              }}
              inputMode="numeric"
              maxLength={15}
              disabled={sendOtp.isPending}
              autoFocus
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={sendOtp.isPending || phone.trim().length < 10}
              className="h-10 px-4 bg-foreground text-background rounded-lg text-xs font-medium hover:opacity-90 disabled:opacity-40 transition-all shrink-0"
            >
              {getSendLabel()}
            </button>
          </div>
        </div>

        {otpSent && (
          <div className="space-y-1.5 animate-in fade-in slide-in-from-bottom-1 duration-300">
            <label htmlFor="otp-input" className="text-xs font-medium text-foreground">Enter OTP</label>
            <p className="text-[11px] text-muted-foreground">Check your SMS — valid for 10 minutes.</p>
            <div className="flex gap-2">
              <input
                id="otp-input"
                className="flex-1 h-10 px-3 border border-border rounded-lg bg-background text-sm tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring"
                placeholder="• • • • • •"
                maxLength={6}
                value={otp}
                onChange={(e) => { setOtp(e.target.value.replaceAll(/\D/g, "")); setError("") }}
                autoComplete="one-time-code"
                inputMode="numeric"
                autoFocus
              />
              <button
                type="button"
                onClick={handleVerify}
                disabled={verifyOtp.isPending || otp.length < 6}
                className="h-10 px-4 bg-foreground text-background rounded-lg text-xs font-medium hover:opacity-90 disabled:opacity-40 transition-all shrink-0"
              >
                {verifyOtp.isPending ? "Verifying…" : "Verify →"}
              </button>
            </div>
          </div>
        )}

        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    </div>
  )
}

// ─── Step 2 — Name + Role ─────────────────────────────────────────────────────

interface StepProfileProps {
  readonly name: string;    readonly setName: (v: string) => void
  readonly role: Role;      readonly setRole: (v: Role) => void
}

function StepProfile({ name, setName, role, setRole }: StepProfileProps) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Who are you?</h2>
        <p className="text-xs text-muted-foreground mt-1">This helps the AI personalise how it handles your notifications.</p>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="name-input" className="text-xs font-medium text-foreground">Your name</label>
        <input
          id="name-input"
          className="w-full h-10 px-3 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring"
          placeholder="e.g. Alex Chen"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
      </div>

      <div className="space-y-1.5">
        <p className="text-xs font-medium text-foreground">Your role</p>
        <div className="grid grid-cols-2 gap-2">
          {ROLES.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => setRole(r.value)}
              className={cn(
                "text-left p-3 rounded-lg border text-xs transition-all",
                role === r.value
                  ? "border-foreground bg-foreground/5 text-foreground"
                  : "border-border bg-card text-muted-foreground hover:border-foreground/30 hover:text-foreground"
              )}
            >
              <div className="text-lg mb-1">{r.icon}</div>
              <div className="font-semibold text-foreground">{r.label}</div>
              <div className="text-[11px] mt-0.5 text-muted-foreground leading-tight">{r.description}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Step 3 — Notification Pref + Starting Mode ───────────────────────────────

interface StepPreferencesProps {
  readonly pref: NotificationPref; readonly setPref: (v: NotificationPref) => void
  readonly mode: ManualMode;       readonly setMode: (v: ManualMode) => void
}

function StepPreferences({ pref, setPref, mode, setMode }: StepPreferencesProps) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Notification preferences</h2>
        <p className="text-xs text-muted-foreground mt-1">The AI uses these as a baseline when deciding what to send.</p>
      </div>

      <div className="space-y-1.5">
        <p className="text-xs font-medium text-foreground">Which notifications should reach you?</p>
        <div className="space-y-2">
          {NOTIF_PREFS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => setPref(p.value)}
              className={cn(
                "w-full text-left px-3 py-2.5 rounded-lg border text-xs transition-all flex items-center gap-3",
                pref === p.value ? "border-foreground bg-foreground/5" : "border-border bg-card text-muted-foreground hover:border-foreground/30 hover:text-foreground"
              )}
            >
              <div className={cn("w-3.5 h-3.5 rounded-full border-2 shrink-0 flex items-center justify-center", pref === p.value ? "border-foreground" : "border-muted-foreground")}>
                {pref === p.value && <div className="w-1.5 h-1.5 rounded-full bg-foreground" />}
              </div>
              <div>
                <div className="font-semibold text-foreground">{p.label}</div>
                <div className="text-[11px] text-muted-foreground">{p.description}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <p className="text-xs font-medium text-foreground">Starting mode</p>
        <p className="text-[11px] text-muted-foreground">"Auto" lets the AI decide based on your activity.</p>
        <div className="grid grid-cols-3 gap-2">
          {MODES.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => setMode(m.value)}
              className={cn(
                "text-left p-2.5 rounded-lg border text-xs transition-all",
                mode === m.value ? "border-foreground bg-foreground/5" : "border-border bg-card text-muted-foreground hover:border-foreground/30"
              )}
            >
              <div className={cn("font-semibold mb-0.5", m.color)}>{m.label}</div>
              <div className="text-[10px] text-muted-foreground leading-tight">{m.description}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Step 4 — Persona ─────────────────────────────────────────────────────────

interface StepPersonaProps {
  readonly role: Role; readonly persona: string; readonly setPersona: (v: string) => void
}

function StepPersona({ role, persona, setPersona }: StepPersonaProps) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Describe your work style</h2>
        <p className="text-xs text-muted-foreground mt-1">The AI reads this to calibrate decisions. Be specific — more detail = smarter AI.</p>
      </div>

      <div className="space-y-1.5">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Think about…</p>
        <ul className="space-y-1">
          {PERSONA_HINTS[role].map((h) => (
            <li key={h} className="text-xs text-muted-foreground flex gap-2">
              <span className="text-foreground mt-px shrink-0">→</span>
              <span>{h}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="persona-input" className="text-xs font-medium text-foreground">Your persona</label>
        <textarea
          id="persona-input"
          className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring leading-relaxed"
          rows={5}
          placeholder="e.g. I'm a senior backend engineer who prefers 2-hour deep focus sessions. I check Slack twice a day and hate interruptions while coding. GitHub notifications are critical for me."
          value={persona}
          onChange={(e) => setPersona(e.target.value)}
          autoFocus
        />
        <div className={cn("text-[10px] text-right transition-colors", persona.length < 30 ? "text-muted-foreground" : "text-green-500")}>
          {persona.length} chars {persona.length < 30 ? "(aim for at least 30)" : "✓"}
        </div>
      </div>
    </div>
  )
}

// ─── Success ──────────────────────────────────────────────────────────────────

interface SuccessStateProps {
  readonly name: string; readonly role: Role; readonly onCreateAnother: () => void
}

function SuccessState({ name, role, onCreateAnother }: SuccessStateProps) {
  const roleData = ROLES.find((r) => r.value === role) ?? ROLES[0]
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-background via-background to-muted/20 p-12 backdrop-blur text-center">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(120,119,198,0.1),transparent_50%)]" />
      <div className="relative flex flex-col items-center gap-4 animate-in fade-in zoom-in-95 duration-700">
        <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-foreground/10 bg-foreground/5 text-4xl">
          {roleData.icon}
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-semibold tracking-tight">Profile created!</h2>
          <p className="text-sm text-muted-foreground">
            <span className="text-foreground font-medium">{name}</span> is registered as a {role}.<br />
            The AI will start learning your notification behaviour.
          </p>
        </div>
        <button
          onClick={onCreateAnother}
          className="mt-2 h-9 px-4 border border-border rounded-lg text-xs hover:bg-muted transition-colors"
        >
          Create another profile
        </button>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

function getNextLabel(isPending: boolean, step: number): React.ReactNode {
  if (isPending) return "Creating…"
  if (step === TOTAL - 1) return "Create Profile"
  return <><span>Continue</span><ArrowRightIcon className="h-3.5 w-3.5" /></>
}

export function MultiStepForm() {
  const [step, setStep]       = useState(0)
  const [phone, setPhone]     = useState("")
  const [name, setName]       = useState("")
  const [role, setRole]       = useState<Role>("developer")
  const [pref, setPref]       = useState<NotificationPref>("all")
  const [mode, setMode]       = useState<ManualMode>("auto")
  const [persona, setPersona] = useState("")
  const [done, setDone]       = useState(false)

  const createUser = useCreateUser()
  const navigate = useNavigate()
  const progress = ((step + 1) / TOTAL) * 100

  useEffect(() => {
    if (done) {
      const t = setTimeout(() => navigate("/login"), 2000)
      return () => clearTimeout(t)
    }
  }, [done, navigate])

  function canProceed() {
    if (step === 0) return false
    if (step === 1) return name.trim().length > 0
    if (step === 3) return persona.trim().length >= 30
    return true
  }

  function handleNext() {
    if (step < TOTAL - 1) { setStep(step + 1); return }
    createUser.mutate(
      { name, role, persona_description: persona, notification_pref: pref, phone_no: phone },
      { onSuccess: () => setDone(true) }
    )
  }

  function handleReset() {
    setStep(0); setPhone(""); setName(""); setRole("developer")
    setPref("all"); setMode("auto"); setPersona("")
    setDone(false); createUser.reset()
  }

  if (done) {
    return (
      <div className="w-full max-w-lg">
        <SuccessState name={name} role={role} onCreateAnother={handleReset} />
      </div>
    )
  }

  return (
    <div className="w-full max-w-lg">
      <div className="mb-6">
        <span className="text-sm font-semibold tracking-tight text-foreground">CogniShift</span>
        <span className="text-xs text-muted-foreground ml-2">User Registration</span>
      </div>

      <div className="border border-border rounded-xl bg-card p-6 shadow-sm">
        <StepIndicator current={step} total={TOTAL} />

        <div className="mb-6 overflow-hidden rounded-full bg-muted/30 h-[2px]">
          <div
            className="h-full bg-gradient-to-r from-foreground/60 to-foreground transition-all duration-700 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {step === 0 && <StepPhone phone={phone} setPhone={setPhone} onVerified={() => setStep(1)} />}
        {step === 1 && <StepProfile name={name} setName={setName} role={role} setRole={setRole} />}
        {step === 2 && <StepPreferences pref={pref} setPref={setPref} mode={mode} setMode={setMode} />}
        {step === 3 && <StepPersona role={role} persona={persona} setPersona={setPersona} />}

        {createUser.isError && (
          <p className="mt-3 text-xs text-destructive">{(createUser.error as Error).message}</p>
        )}

        {step > 0 && (
          <div className="flex justify-between items-center mt-8 pt-4 border-t border-border">
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="h-9 px-3 border border-border rounded-lg text-xs hover:bg-muted transition-colors"
            >
              ← Back
            </button>
            <button
              type="button"
              onClick={handleNext}
              disabled={!canProceed() || createUser.isPending}
              className="h-9 px-5 bg-foreground text-background rounded-lg text-xs font-medium hover:opacity-90 disabled:opacity-40 transition-all flex items-center gap-1.5"
            >
              {getNextLabel(createUser.isPending, step)}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
