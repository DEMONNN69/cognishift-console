// ─────────────────────────────────────────────
// Phase 1 config — replace USER_ID with your own
// ─────────────────────────────────────────────
export const USER_ID = "d8fa6d08-a5be-48a1-919c-4b7b2956d74a";
export const API_BASE = "http://127.0.0.1:8000/api";

// Maps page hostname → source_app value expected by the backend
// Accepted values: "slack" | "gmail" | "github" | "calendar" | "youtube"
export const SOURCE_APP_MAP = {
  "mail.google.com":     "gmail",
  "app.slack.com":       "slack",
  "slack.com":           "slack",
  "github.com":          "github",
  "calendar.google.com": "calendar",
  "youtube.com":         "youtube",
  "www.youtube.com":     "youtube",
};

// Fallback used when hostname doesn't match anything above
export const DEFAULT_SOURCE_APP = "gmail";
