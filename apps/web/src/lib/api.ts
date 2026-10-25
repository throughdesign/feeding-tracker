import type {
  ApiErrorBody,
  CreateFeedingSessionInput,
  CreatePumpingSessionInput,
  Dashboard,
  FeedingScheduleSettings,
  NextFeeding,
  UpdateFeedingScheduleSettingsInput,
  InsightPeriod,
  Insights,
  FeedingWithSummary,
  PumpingWithTotal,
  UpdateFeedingSessionInput,
  UpdatePumpingSessionInput,
} from "@isaac/shared";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly issues: NonNullable<ApiErrorBody["error"]["issues"]> = [],
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      ...init,
      headers: { "content-type": "application/json", ...init.headers },
    });
  } catch {
    throw new ApiError(0, "NETWORK_ERROR", "Cannot reach the server. Is it running?");
  }
  if (response.status === 204) return undefined as T;
  const body = (await response.json().catch(() => null)) as unknown;
  if (!response.ok) {
    const error = (body as ApiErrorBody | null)?.error;
    throw new ApiError(
      response.status,
      error?.code ?? "UNKNOWN",
      error?.message ?? `Request failed (${response.status})`,
      error?.issues,
    );
  }
  return body as T;
}

const json = (method: string, body: unknown): RequestInit => ({
  method,
  body: JSON.stringify(body),
});

export const api = {
  dashboard: (date?: string) =>
    request<Dashboard>(`/dashboard${date ? `?date=${encodeURIComponent(date)}` : ""}`),

  insights: (days: InsightPeriod) => request<Insights>(`/insights?days=${days}`),

  feedingSchedule: () =>
    request<{ settings: FeedingScheduleSettings; nextFeeding: NextFeeding }>("/feeding-schedule"),
  updateFeedingScheduleSettings: (input: UpdateFeedingScheduleSettingsInput) =>
    request<{ settings: FeedingScheduleSettings; nextFeeding: NextFeeding }>(
      "/feeding-schedule/settings",
      json("PATCH", input),
    ),

  activeFeedings: () => request<FeedingWithSummary[]>("/feedings?status=active"),
  feeding: (id: string) => request<FeedingWithSummary>(`/feedings/${id}`),
  createFeeding: (input: CreateFeedingSessionInput) =>
    request<FeedingWithSummary>("/feedings", json("POST", input)),
  updateFeeding: (id: string, input: UpdateFeedingSessionInput) =>
    request<FeedingWithSummary>(`/feedings/${id}`, json("PATCH", input)),
  deleteFeeding: (id: string) => request<void>(`/feedings/${id}`, { method: "DELETE" }),

  pumping: (id: string) => request<PumpingWithTotal>(`/pumping-sessions/${id}`),
  createPumping: (input: CreatePumpingSessionInput) =>
    request<PumpingWithTotal>("/pumping-sessions", json("POST", input)),
  updatePumping: (id: string, input: UpdatePumpingSessionInput) =>
    request<PumpingWithTotal>(`/pumping-sessions/${id}`, json("PATCH", input)),
  deletePumping: (id: string) => request<void>(`/pumping-sessions/${id}`, { method: "DELETE" }),
};
