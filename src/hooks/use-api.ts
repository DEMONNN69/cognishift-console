import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { ManualMode } from "@/types/api";

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

export function useUserNotifications(userId: string, status?: string) {
  return useQuery({
    queryKey: ["notifications", userId, status],
    queryFn: () => api.getUserNotifications(userId, status),
    enabled: !!userId,
  });
}
