// CogniShift API types — strictly matching API reference

export type SourceApp = "slack" | "gmail" | "github" | "calendar" | "youtube";
export type Priority = "low" | "medium" | "high";
export type Category = "social" | "work" | "urgent";
export type InferredMode = "focus" | "work" | "meeting" | "relax" | "sleep";
export type ManualMode = "auto" | "focus" | "work" | "meeting" | "relax" | "sleep";
export type Decision = "send" | "delay" | "block";
export type AppCategory = "productivity" | "communication" | "leisure";
export type BlockType = "meeting" | "focus" | "break" | "free";
export type Action = "seen" | "ignored" | "dismissed" | "snoozed";
export type Role = "developer" | "manager" | "student" | "designer";
export type NotificationPref = "all" | "priority" | "urgent_only";
export type NotifStatus = "pending" | "sent" | "blocked" | "queued" | "delivered";

export interface ActiveApp {
  id: string;
  app_name: string;
  app_category: AppCategory;
  started_at: string;
  is_active: boolean;
}

export interface ScheduleBlock {
  id: string;
  title: string;
  block_type: BlockType;
  start_time: string;
  end_time: string;
}

export interface User {
  id: string;
  name: string;
  role: Role;
  persona_description: string;
  notification_pref: NotificationPref;
  manual_mode: ManualMode;
  active_app: ActiveApp | null;
  current_block: ScheduleBlock | null;
}

export interface NotificationEvent {
  id: string;
  user: string;
  source_app: SourceApp;
  message: string;
  triggered_at: string;
  ai_priority: Priority | "";
  ai_category: Category | "";
  status: NotifStatus;
}

export interface DecisionEntry {
  id: string;
  user_name: string;
  user_role: Role;
  user_id: string;
  notification_id: string;
  notification_source: SourceApp;
  notification_message: string;
  active_app_snapshot: string | null;
  active_app_category_snapshot: AppCategory | null;
  schedule_block_snapshot: BlockType | null;
  recent_ignored_count: number;
  last_interactions_snapshot: Action[];
  time_of_day_snapshot: string;
  inferred_mode: InferredMode;
  decision: Decision;
  ai_reason: string;
  delay_until: string | null;
  created_at: string;
}

export interface SimulationNotification {
  notification_id: string;
  decision: Decision;
  inferred_mode: InferredMode;
  ai_priority: Priority;
  ai_category: Category;
  ai_reason: string;
  delay_until: string | null;
}

export interface SimulationResult {
  user: string;
  app_rotated: boolean;
  notification: SimulationNotification | null;
}

export interface SimulationResponse {
  tick: string;
  results: SimulationResult[];
}

// --- Request / Response types for write endpoints ---

export interface GenerateEventRequest {
  user_id: string;
  source_app: SourceApp;
  message: string;
}

export interface GenerateEventResponse {
  notification_id: string;
  decision: Decision;
  inferred_mode: InferredMode;
  ai_priority: Priority;
  ai_category: Category;
  ai_reason: string;
  delay_until: string | null;
}

export interface ClassifyRequest {
  message: string;
  context_snapshot?: Partial<Record<string, string | number>>;
}

export interface ClassifyResponse {
  priority: Priority;
  category: Category;
}

export interface DetectModeRequest {
  user_id: string;
}

export interface DetectModeResponse {
  inferred_mode: InferredMode;
  ai_reason: string;
}

export interface DecisionLookupRequest {
  priority: Priority;
  inferred_mode: InferredMode;
}

export interface DecisionLookupResponse {
  decision: Decision;
  delay_minutes: number;
}

export interface LogInteractionRequest {
  user_id: string;
  notification_id: string;
  action: Action;
}

export interface LogInteractionResponse {
  id: string;
  action: Action;
}

export interface SetModeRequest {
  mode: ManualMode;
}

export interface SetModeResponse {
  mode: ManualMode;
  drained: GenerateEventResponse[];
}

export interface CreateUserRequest {
  name: string;
  role: Role;
  persona_description: string;
  notification_pref: NotificationPref;
  phone_no?: string;
}
