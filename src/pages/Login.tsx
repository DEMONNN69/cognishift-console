"use client"

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { cn } from "@/lib/utils"
import { useSendLoginOtp, useLoginVerifyOtp } from "@/hooks/use-api"
import { auth } from "@/lib/auth"

export default function Login() {
  const navigate = useNavigate()

  const [phone, setPhone]     = useState("")
  const [otp, setOtp]         = useState("")
  const [otpSent, setOtpSent] = useState(false)
  const [error, setError]     = useState("")
  const [done, setDone]       = useState(false)
  const [userName, setUserName] = useState("")

  const sendOtp   = useSendLoginOtp()
  const verifyOtp = useLoginVerifyOtp()

  function handleSend() {
    setError("")
    if (!phone.trim()) { setError("Enter your phone number first."); return }
    sendOtp.mutate({ phone: phone.trim() }, {
      onSuccess: () => setOtpSent(true),
      onError: (e) => setError((e as Error).message),
    })
  }

  function handleVerify() {
    setError("")
    if (!otp.trim()) { setError("Enter the OTP you received."); return }
    verifyOtp.mutate({ phone: phone.trim(), otp: otp.trim() }, {
      onSuccess: (data) => {
        auth.setSession(data.token, { user_id: data.user_id, name: data.name, role: data.role })
        setUserName(data.name)
        setDone(true)
      },
      onError: (e) => setError((e as Error).message),
    })
  }

  function getSendLabel() {
    if (sendOtp.isPending) return "Sending…"
    if (otpSent) return "Resend"
    return "Send OTP"
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">

        {/* Branding header */}
        <div className="mb-6">
          <span className="text-sm font-semibold tracking-tight text-foreground">CogniShift</span>
          <span className="text-xs text-muted-foreground ml-2">Sign in</span>
        </div>

        <div className="border border-border rounded-xl bg-card p-6 shadow-sm">

          {done ? (
            /* ── Success ──────────────────────────────────────────────── */
            <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-background via-background to-muted/20 p-12 backdrop-blur text-center">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(120,119,198,0.1),transparent_50%)]" />
              <div className="relative flex flex-col items-center gap-4 animate-in fade-in zoom-in-95 duration-700">
                <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-foreground/10 bg-foreground/5 text-3xl">
                  👋
                </div>
                <div className="space-y-1">
                  <h2 className="text-xl font-semibold tracking-tight">Welcome back, {userName}!</h2>
                  <p className="text-sm text-muted-foreground">You're signed in. Redirecting you to the dashboard…</p>
                </div>
                <button
                  onClick={() => navigate("/me")}
                  className="mt-2 h-9 px-5 bg-foreground text-background rounded-lg text-xs font-medium hover:opacity-90 transition-all"
                >
                  Go to Dashboard →
                </button>
              </div>
            </div>
          ) : (
            /* ── Phone + OTP form ─────────────────────────────────────── */
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div>
                <h2 className="text-lg font-semibold tracking-tight">Sign in to your account</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Enter your registered phone number to receive an OTP.
                </p>
              </div>

              {/* Phone field */}
              <div className="space-y-1.5">
                <label htmlFor="login-phone" className="text-xs font-medium text-foreground">
                  Phone number
                </label>
                <div className="flex gap-2">
                  <input
                    id="login-phone"
                    className="flex-1 h-10 px-3 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring disabled:opacity-50"
                    placeholder="+91 9876543210"
                    value={phone}
                    onChange={(e) => { setPhone(e.target.value); setOtpSent(false); setOtp(""); setError("") }}
                    disabled={sendOtp.isPending}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={sendOtp.isPending || !phone.trim()}
                    className="h-10 px-4 bg-foreground text-background rounded-lg text-xs font-medium hover:opacity-90 disabled:opacity-40 transition-all shrink-0"
                  >
                    {getSendLabel()}
                  </button>
                </div>
              </div>

              {/* OTP field */}
              {otpSent && (
                <div className="space-y-1.5 animate-in fade-in slide-in-from-bottom-1 duration-300">
                  <label htmlFor="login-otp" className="text-xs font-medium text-foreground">
                    Enter OTP
                  </label>
                  <p className="text-[11px] text-muted-foreground">Check your SMS — valid for 10 minutes.</p>
                  <div className="flex gap-2">
                    <input
                      id="login-otp"
                      className="flex-1 h-10 px-3 border border-border rounded-lg bg-background text-sm tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring"
                      placeholder="• • • • • •"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => { setOtp(e.target.value.replaceAll(/\D/g, "")); setError("") }}
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={handleVerify}
                      disabled={verifyOtp.isPending || otp.length < 6}
                      className="h-10 px-4 bg-foreground text-background rounded-lg text-xs font-medium hover:opacity-90 disabled:opacity-40 transition-all shrink-0"
                    >
                      {verifyOtp.isPending ? "Verifying…" : "Sign in →"}
                    </button>
                  </div>
                </div>
              )}

              {error && <p className="text-xs text-destructive">{error}</p>}

              {/* Register link */}
              <p className={cn("text-center text-xs text-muted-foreground", otpSent ? "pt-2" : "")}>
                Don't have an account?{" "}
                <a href="/register" className="text-foreground font-medium hover:underline underline-offset-2">
                  Register
                </a>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
