import { MultiStepForm } from "@/components/ui/multistep-form";

// ─── Step data ────────────────────────────────────────────────────────────────

const ROLES: { value: Role; label: string; icon: string; description: string }[] = [
  { value: "developer",  label: "Developer",  icon: "⌨️", description: "I build things and need deep focus time" },
  { value: "manager",    label: "Manager",    icon: "📋", description: "I coordinate teams and run back-to-back meetings" },
  { value: "student",    label: "Student",    icon: "📚", description: "I study, attend lectures, and take breaks" },
  { value: "designer",   label: "Designer",   icon: "🎨", description: "I do long creative sessions in design tools" },
];

const NOTIF_PREFS: { value: NotificationPref; label: string; description: string }[] = [
  { value: "all",          label: "All",          description: "Receive every notification" },
  { value: "priority",     label: "Priority only", description: "Only medium and high priority" },
  { value: "urgent_only",  label: "Urgent only",   description: "Only notifications marked urgent" },
];

const MODES: { value: ManualMode; label: string; description: string; color: string }[] = [
  { value: "auto",    label: "Auto",    description: "AI infers my mode from context",   color: "text-blue-400" },
  { value: "focus",   label: "Focus",   description: "Deep work — minimise all noise",   color: "text-purple-400" },
  { value: "work",    label: "Work",    description: "General office activity",           color: "text-green-400" },
  { value: "meeting", label: "Meeting", description: "I'm in a call or meeting",          color: "text-yellow-400" },
  { value: "relax",   label: "Relax",   description: "Free time — show me everything",   color: "text-sky-400" },
  { value: "sleep",   label: "Sleep",   description: "Do not disturb",                   color: "text-slate-400" },
];

const PERSONA_HINTS: Record<Role, string[]> = {
  developer:  ["Do you prefer uninterrupted coding blocks?", "Which tools do you use most — VS Code, terminal, Slack?", "How often do you check notifications — hourly, twice a day?"],
  manager:    ["How many meetings do you have per day?", "Do you need to be reachable at all times?", "How do you handle urgent notifications during meetings?"],
  student:    ["Do you have scheduled lecture times?", "Do you tend to study late at night?", "How easily are you distracted?"],
  designer:   ["Do you prefer long uninterrupted sessions in Figma?", "How often do you need to collaborate vs. work solo?", "Are design review notifications high priority for you?"],
};

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <div
            className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold border transition-all ${
              i + 1 === current
                ? "border-primary bg-primary text-primary-foreground"
                : i + 1 < current
                ? "border-primary bg-primary/20 text-primary"
                : "border-border bg-transparent text-muted-foreground"
            }`}
          >
            {i + 1 < current ? "✓" : i + 1}
          </div>
          {i < total - 1 && (
            <div className={`w-8 h-px ${i + 1 < current ? "bg-primary" : "bg-border"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Step 1 — Phone + OTP ─────────────────────────────────────────────────────

function Step1Phone({
  phone,
  setPhone,
  onVerified,
}: {
  phone: string;
  setPhone: (v: string) => void;
  onVerified: () => void;
}) {
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");

  const sendOtp = useSendOtp();
  const verifyOtp = useVerifyOtp();

  function handleSend() {
    setError("");
    if (!phone.trim()) { setError("Enter your phone number first."); return; }
    sendOtp.mutate(
      { phone: phone.trim() },
      {
        onSuccess: () => setOtpSent(true),
        onError: (e) => setError((e as Error).message),
      }
    );
  }

  function handleVerify() {
    setError("");
    if (!otp.trim()) { setError("Enter the OTP you received."); return; }
    verifyOtp.mutate(
      { phone: phone.trim(), otp: otp.trim() },
      {
        onSuccess: () => onVerified(),
        onError: (e) => setError((e as Error).message),
      }
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-foreground">Verify your phone</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          We'll send a one-time password to confirm your number before creating your profile.
        </p>
      </div>

      <div className="space-y-4">
        {/* Phone input row */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-foreground">Phone number</label>
          <div className="flex gap-2">
            <input
              className="flex-1 h-9 px-3 border border-border rounded-md bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="+91 9876543210"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                setOtpSent(false);
                setOtp("");
                setError("");
              }}
              disabled={sendOtp.isPending}
              autoFocus
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={sendOtp.isPending || !phone.trim()}
              className="h-9 px-4 bg-primary text-primary-foreground rounded-md text-xs font-medium hover:opacity-90 disabled:opacity-40 transition-all shrink-0"
            >
              {sendOtp.isPending ? "Sending…" : otpSent ? "Resend" : "Send OTP"}
            </button>
          </div>
        </div>

        {/* OTP input — shown after send */}
        {otpSent && (
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Enter OTP</label>
            <p className="text-[11px] text-muted-foreground">Check your SMS. The code is valid for 10 minutes.</p>
            <div className="flex gap-2">
              <input
                className="flex-1 h-9 px-3 border border-border rounded-md bg-background text-sm tracking-widest text-center focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="• • • • • •"
                maxLength={6}
                value={otp}
                onChange={(e) => {
                  setOtp(e.target.value.replace(/\D/g, ""));
                  setError("");
                }}
                autoFocus
              />
              <button
                type="button"
                onClick={handleVerify}
                disabled={verifyOtp.isPending || otp.length < 6}
                className="h-9 px-4 bg-primary text-primary-foreground rounded-md text-xs font-medium hover:opacity-90 disabled:opacity-40 transition-all shrink-0"
              >
                {verifyOtp.isPending ? "Verifying…" : "Verify →"}
              </button>
            </div>
          </div>
        )}

        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    </div>
  );
}

// ─── Step 2 — Name + Role ─────────────────────────────────────────────────────

function Step2({
  name, setName, role, setRole,
}: {
  name: string; setName: (v: string) => void;
  role: Role; setRole: (v: Role) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-foreground">Who are you?</h2>
        <p className="text-xs text-muted-foreground mt-0.5">This helps the AI personalise how it handles your notifications.</p>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-foreground">Your name</label>
        <input
          className="w-full h-9 px-3 border border-border rounded-md bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          placeholder="e.g. Alex Chen"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-foreground">Your role</label>
        <div className="grid grid-cols-2 gap-2">
          {ROLES.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => setRole(r.value)}
              className={`text-left p-3 rounded-md border text-xs transition-all ${
                role === r.value
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground"
              }`}
            >
              <div className="text-lg mb-1">{r.icon}</div>
              <div className="font-semibold text-foreground">{r.label}</div>
              <div className="text-[11px] mt-0.5 text-muted-foreground">{r.description}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Step 3 — Notification Preference + Starting Mode ─────────────────────────

function Step3({
  pref, setPref, mode, setMode,
}: {
  pref: NotificationPref; setPref: (v: NotificationPref) => void;
  mode: ManualMode; setMode: (v: ManualMode) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-foreground">Your notification preferences</h2>
        <p className="text-xs text-muted-foreground mt-0.5">The AI will use these as a baseline when deciding what to send.</p>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-foreground">Which notifications should reach you?</label>
        <div className="space-y-2">
          {NOTIF_PREFS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => setPref(p.value)}
              className={`w-full text-left px-3 py-2.5 rounded-md border text-xs transition-all flex items-center gap-3 ${
                pref === p.value
                  ? "border-primary bg-primary/10"
                  : "border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground"
              }`}
            >
              <div className={`w-3.5 h-3.5 rounded-full border-2 shrink-0 flex items-center justify-center ${
                pref === p.value ? "border-primary" : "border-muted-foreground"
              }`}>
                {pref === p.value && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
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
        <label className="text-xs font-medium text-foreground">Starting mode</label>
        <p className="text-[11px] text-muted-foreground">"Auto" lets the AI decide based on your activity.</p>
        <div className="grid grid-cols-3 gap-2">
          {MODES.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => setMode(m.value)}
              className={`text-left p-2.5 rounded-md border text-xs transition-all ${
                mode === m.value
                  ? "border-primary bg-primary/10"
                  : "border-border bg-card text-muted-foreground hover:border-primary/50"
              }`}
            >
              <div className={`font-semibold mb-0.5 ${m.color}`}>{m.label}</div>
              <div className="text-[10px] text-muted-foreground leading-tight">{m.description}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Step 4 — Persona description ─────────────────────────────────────────────

function Step4({
  role, persona, setPersona,
}: {
  role: Role; persona: string; setPersona: (v: string) => void;
}) {
  const hints = PERSONA_HINTS[role];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-foreground">Describe your work style</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          The AI reads this to calibrate its decisions. Be specific — the more detail, the smarter it gets.
        </p>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Think about…</label>
        <ul className="space-y-1">
          {hints.map((h) => (
            <li key={h} className="text-xs text-muted-foreground flex gap-2">
              <span className="text-primary mt-px">→</span>
              <span>{h}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-foreground">Your persona</label>
        <textarea
          className="w-full px-3 py-2.5 border border-border rounded-md bg-background text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed"
          rows={5}
          placeholder="e.g. I'm a senior backend engineer who prefers 2-hour deep focus sessions in the morning. I check Slack twice a day and hate being interrupted while coding. GitHub notifications are critical for me."
          value={persona}
          onChange={(e) => setPersona(e.target.value)}
          autoFocus
        />
        <div className={`text-[10px] text-right ${persona.length < 30 ? "text-muted-foreground" : "text-green-500"}`}>
          {persona.length} chars {persona.length < 30 ? "(aim for at least 30)" : "✓"}
        </div>
      </div>
    </div>
  );
}

// ─── Success state ─────────────────────────────────────────────────────────────

function SuccessState({ name, role, onCreateAnother }: { name: string; role: Role; onCreateAnother: () => void }) {
  const roleData = ROLES.find((r) => r.value === role)!;
  return (
    <div className="text-center space-y-4 py-4">
      <div className="text-5xl">{roleData.icon}</div>
      <div>
        <h2 className="text-base font-semibold text-foreground">Profile created!</h2>
        <p className="text-xs text-muted-foreground mt-1">
          <span className="text-foreground font-medium">{name}</span> is now registered as a {role}.<br />
          The AI will start learning their notification behaviour.
        </p>
      </div>
      <div className="pt-2">
        <button
          onClick={onCreateAnother}
          className="h-8 px-4 border border-border rounded-md text-xs hover:bg-secondary transition-colors"
        >
          Create another profile
        </button>
      </div>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function Register() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <MultiStepForm />
    </div>
  );
}
