import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { ManualMode, CreateUserRequest } from "@/types/api";

export function useUsers(enabled = true, refetchInterval?: number) {
  return useQuery({
    queryKey: ["users"],
    queryFn: api.getUsers,
    enabled,
    refetchInterval: refetchInterval || false,
  });
}

export function useDecisions(refetchInterval?: number) {
  return useQuery({
    queryKey: ["decisions"],
    queryFn: api.getDecisions,
    refetchInterval: refetchInterval || false,
  });
}

export function useSimulation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.runSimulation,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      qc.invalidateQueries({ queryKey: ["decisions"] });
    },
  });
}

export function useHealthCheck() {
  return useQuery({
    queryKey: ["health"],
    queryFn: api.checkHealth,
    refetchInterval: 10000,
  });
}

export function useGenerateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.generateEvent,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["decisions"] });
    },
  });
}

export function useClassify() {
  return useMutation({ mutationFn: api.classify });
}

export function useDetectMode() {
  return useMutation({ mutationFn: api.detectMode });
}

export function useDecisionLookup() {
  return useMutation({ mutationFn: api.decisionLookup });
}

export function useLogInteraction() {
  return useMutation({ mutationFn: api.logInteraction });
}

export function useSetMode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, mode }: { userId: string; mode: ManualMode }) =>
      api.setMode(userId, { mode }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useUserQueue(userId: string, enabled = false) {
  return useQuery({
    queryKey: ["queue", userId],
    queryFn: () => api.getUserQueue(userId),
    enabled,
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateUserRequest) => api.createUser(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useUserNotifications(userId: string, status?: string) {
  return useQuery({
    queryKey: ["notifications", userId, status],
    queryFn: () => api.getUserNotifications(userId, status),
    enabled: !!userId,
  });
}

export function useSendOtp() {
  return useMutation({ mutationFn: (body: { phone: string }) => api.sendOtp(body) });
}

export function useVerifyOtp() {
  return useMutation({
    mutationFn: (body: { phone: string; otp: string }) => api.verifyOtp(body),
  });
}

export function useSendLoginOtp() {
  return useMutation({ mutationFn: (body: { phone: string }) => api.sendLoginOtp(body) });
}

export function useLoginVerifyOtp() {
  return useMutation({
    mutationFn: (body: { phone: string; otp: string }) => api.loginVerifyOtp(body),
  });
}

export function useTelegramLink(userId: string) {
  return useQuery({
    queryKey: ["telegram-link", userId],
    queryFn: () => api.getTelegramLink(userId),
    enabled: !!userId,
    refetchInterval: 8000, // poll so the UI updates once user connects via bot
  });
}

export interface SummaryData {
  headline: string
  stats: Array<{ label: string; value: string }>
  insights: string[]
  tip: string
}

export function useSummariseNotifications() {
  return useMutation({
    mutationFn: async (userId: string): Promise<{ summary: SummaryData }> => {
      const { getApiBaseUrl } = await import("@/lib/api");
      const res = await fetch(`${getApiBaseUrl()}/users/${userId}/summarise/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Failed to generate summary");
      return res.json();
    },
  });
}

export function useSetAppSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, app_name, app_category }: { userId: string; app_name: string; app_category: string }) =>
      api.setAppSession(userId, { app_name, app_category }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useCalendarCurrent(userId: string) {
  return useQuery({
    queryKey: ["calendar-current", userId],
    queryFn: () => api.getCalendarCurrent(userId),
    enabled: !!userId,
    refetchInterval: 60_000, // refresh every minute
  });
}
