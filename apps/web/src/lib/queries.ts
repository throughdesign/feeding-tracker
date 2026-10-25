import type {
  CreateFeedingSessionInput,
  CreatePumpingSessionInput,
  FeedingWithSummary,
  InsightPeriod,
  UpdateFeedingSessionInput,
  UpdatePumpingSessionInput,
} from "@isaac/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";

export const keys = {
  insights: (days: number) => ["insights", days] as const,
  dashboard: (date?: string) => ["dashboard", date ?? "today"] as const,
  activeFeeding: ["feedings", "active"] as const,
  feeding: (id: string) => ["feedings", id] as const,
  pumping: (id: string) => ["pumping", id] as const,
};

export function useDashboard(date?: string) {
  return useQuery({
    queryKey: keys.dashboard(date),
    queryFn: () => api.dashboard(date),
    // Keeps "today" and the timeline fresh when both parents log entries.
    refetchInterval: 60_000,
  });
}

export function useInsights(days: InsightPeriod) {
  return useQuery({
    queryKey: keys.insights(days),
    queryFn: () => api.insights(days),
    refetchInterval: 60_000,
  });
}

/** The single in-progress feeding, if any. Recovered from the server after reloads. */
export function useActiveFeeding() {
  return useQuery({
    queryKey: keys.activeFeeding,
    queryFn: async () => (await api.activeFeedings())[0] ?? null,
  });
}

export function useFeeding(id: string | undefined) {
  return useQuery({
    queryKey: keys.feeding(id ?? ""),
    queryFn: () => api.feeding(id!),
    enabled: Boolean(id),
  });
}

export function usePumping(id: string | undefined) {
  return useQuery({
    queryKey: keys.pumping(id ?? ""),
    queryFn: () => api.pumping(id!),
    enabled: Boolean(id),
  });
}

function useInvalidateAll() {
  const client = useQueryClient();
  return () =>
    Promise.all([
      client.invalidateQueries({ queryKey: ["dashboard"] }),
      client.invalidateQueries({ queryKey: ["insights"] }),
      client.invalidateQueries({ queryKey: ["feedings"] }),
      client.invalidateQueries({ queryKey: ["pumping"] }),
    ]);
}

function useStoreFeeding() {
  const client = useQueryClient();
  return (feeding: FeedingWithSummary) => {
    client.setQueryData(keys.feeding(feeding.id), feeding);
    client.setQueryData(keys.activeFeeding, feeding.status === "active" ? feeding : null);
  };
}

export function useCreateFeeding() {
  const invalidate = useInvalidateAll();
  const store = useStoreFeeding();
  return useMutation({
    mutationFn: (input: CreateFeedingSessionInput) => api.createFeeding(input),
    onSuccess: (feeding) => {
      store(feeding);
      void invalidate();
    },
  });
}

export function useUpdateFeeding(id: string) {
  const invalidate = useInvalidateAll();
  const store = useStoreFeeding();
  return useMutation({
    mutationFn: (input: UpdateFeedingSessionInput) => api.updateFeeding(id, input),
    onSuccess: (feeding) => {
      store(feeding);
      void invalidate();
    },
  });
}

export function useDeleteFeeding() {
  const invalidate = useInvalidateAll();
  return useMutation({ mutationFn: api.deleteFeeding, onSuccess: () => invalidate() });
}

export function useCreatePumping() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (input: CreatePumpingSessionInput) => api.createPumping(input),
    onSuccess: () => invalidate(),
  });
}

export function useUpdatePumping(id: string) {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (input: UpdatePumpingSessionInput) => api.updatePumping(id, input),
    onSuccess: () => invalidate(),
  });
}

export function useDeletePumping() {
  const invalidate = useInvalidateAll();
  return useMutation({ mutationFn: api.deletePumping, onSuccess: () => invalidate() });
}
