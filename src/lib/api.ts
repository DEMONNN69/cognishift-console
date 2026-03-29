import type {
  User, DecisionEntry, SimulationResponse,
  GenerateEventRequest, GenerateEventResponse,
  ClassifyRequest, ClassifyResponse,
  DetectModeRequest, DetectModeResponse,
  DecisionLookupRequest, DecisionLookupResponse,
  LogInteractionRequest, LogInteractionResponse,
  SetModeRequest, SetModeResponse,
  CreateUserRequest,
  NotificationEvent,
  LoginVerifyResponse,
} from "@/types/api";

let baseUrl = "http://192.168.12.82:8000/api";

export const getApiBaseUrl = () => baseUrl;
export const setApiBaseUrl = (url: string) => { baseUrl = url; };

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${baseUrl}${path}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `API ${res.status}`);
  }
  return res.json();
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `API ${res.status}`);
  }
  return res.json();
}

async function patchJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${baseUrl}${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `API ${res.status}`);
  }
  return res.json();
}

export const api = {
  // --- Existing read endpoints ---
  getUsers: () => fetchJson<User[]>("/users/"),
  getDecisions: () => fetchJson<DecisionEntry[]>("/decisions/"),
  runSimulation: () => fetchJson<SimulationResponse>("/simulate/run/"),
  checkHealth: async (): Promise<boolean> => {
    try {
      await fetch(`${baseUrl}/users/`, { method: "GET", signal: AbortSignal.timeout(3000) });
      return true;
    } catch {
      return false;
    }
  },

  // --- Pipeline endpoints ---
  generateEvent: (body: GenerateEventRequest) =>
    postJson<GenerateEventResponse>("/generate-event/", body),
  classify: (body: ClassifyRequest) =>
    postJson<ClassifyResponse>("/classify/", body),
  detectMode: (body: DetectModeRequest) =>
    postJson<DetectModeResponse>("/detect-mode/", body),
  decisionLookup: (body: DecisionLookupRequest) =>
    postJson<DecisionLookupResponse>("/decision/", body),
  logInteraction: (body: LogInteractionRequest) =>
    postJson<LogInteractionResponse>("/interactions/", body),

  // --- User management ---
  createUser: (body: CreateUserRequest) =>
    postJson<User>("/users/", body),

  // --- Registration OTP ---
  sendOtp: (body: { phone: string }) =>
    postJson<{ sent: boolean }>("/auth/send-otp/", body),
  verifyOtp: (body: { phone: string; otp: string }) =>
    postJson<{ verified: boolean }>("/auth/verify-otp/", body),

  // --- Login OTP ---
  sendLoginOtp: (body: { phone: string }) =>
    postJson<{ sent: boolean }>("/auth/login/send-otp/", body),
  loginVerifyOtp: (body: { phone: string; otp: string }) =>
    postJson<LoginVerifyResponse>("/auth/login/verify-otp/", body),

  // --- User-scoped endpoints ---
  setMode: (userId: string, body: SetModeRequest) =>
    postJson<SetModeResponse>(`/users/${userId}/set-mode/`, body),
  updateUser: (userId: string, body: Partial<Pick<User, "name" | "role" | "persona_description" | "notification_pref" | "manual_mode">>) =>
    patchJson<User>(`/users/${userId}/`, body),
  getUserQueue: (userId: string) =>
    fetchJson<NotificationEvent[]>(`/users/${userId}/queue/`),
  getUserNotifications: (userId: string, status?: string) =>
    fetchJson<NotificationEvent[]>(`/users/${userId}/notifications/${status ? `?status=${status}` : ""}`),
  getTelegramLink: (userId: string) =>
    fetchJson<{ link: string; linked: boolean; chat_id: string | null }>(`/users/${userId}/telegram-link/`),
};
