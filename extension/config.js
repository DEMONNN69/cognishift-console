// Phase 2 default API config.
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