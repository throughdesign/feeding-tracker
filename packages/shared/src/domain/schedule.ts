import {
  DEFAULT_FEEDING_SCHEDULE_SETTINGS,
  type FeedingScheduleSettings,
} from "../schemas/schedule.js";
import { zonedMinuteOfDay } from "../time.js";
import type { FeedingSession } from "../types/index.js";

export type ScheduleMode = "day" | "night";

/**
 * The next feeding, derived from feeding history and settings. Nothing here is
 * stored: it is recomputed whenever feedings or settings change.
 */
export type NextFeeding =
  | { state: "no-history"; settings: FeedingScheduleSettings }
  | {
      state: "scheduled";
      settings: FeedingScheduleSettings;
      lastFeeding: Pick<FeedingSession, "id" | "startedAt" | "status">;
      mode: ScheduleMode;
      intervalMinutes: number;
      nextFeedingAt: string;
    };

export type NextFeedingPhase = "in-progress" | "upcoming" | "overdue";

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number) as [number, number];
  return h * 60 + m;
};

/** Whether a local minute-of-day falls in the night window [start, end), which may wrap midnight. */
export function isNightMinute(
  minuteOfDay: number,
  nightStartsAt: string,
  nightEndsAt: string,
): boolean {
  const start = toMinutes(nightStartsAt);
  const end = toMinutes(nightEndsAt);
  return start < end
    ? minuteOfDay >= start && minuteOfDay < end
    : minuteOfDay >= start || minuteOfDay < end;
}

/** The mode for a feeding that started at `instant`. Night only applies when explicitly enabled. */
export function scheduleModeAt(instant: string, settings: FeedingScheduleSettings): ScheduleMode {
  if (!settings.nightModeEnabled) return "day";
  return isNightMinute(zonedMinuteOfDay(instant), settings.nightStartsAt, settings.nightEndsAt)
    ? "night"
    : "day";
}

export function resolveScheduleSettings(
  stored: FeedingScheduleSettings | undefined,
): FeedingScheduleSettings {
  return stored ?? DEFAULT_FEEDING_SCHEDULE_SETTINGS;
}

/**
 * Next feeding = start of the latest feeding (any type, including an active
 * one) + the interval of the mode in effect at that start. Start-to-start, in
 * elapsed time, so DST changes don't shorten or lengthen the interval.
 * Pumping sessions are not considered.
 */
export function computeNextFeeding(
  feedings: Pick<FeedingSession, "id" | "startedAt" | "status">[],
  settings: FeedingScheduleSettings,
): NextFeeding {
  let latest: (typeof feedings)[number] | undefined;
  for (const feeding of feedings) {
    if (!latest || Date.parse(feeding.startedAt) > Date.parse(latest.startedAt)) latest = feeding;
  }
  if (!latest) return { state: "no-history", settings };

  const mode = scheduleModeAt(latest.startedAt, settings);
  const intervalMinutes =
    mode === "night" ? settings.nightIntervalMinutes : settings.dayIntervalMinutes;
  return {
    state: "scheduled",
    settings,
    lastFeeding: { id: latest.id, startedAt: latest.startedAt, status: latest.status },
    mode,
    intervalMinutes,
    nextFeedingAt: new Date(Date.parse(latest.startedAt) + intervalMinutes * 60_000).toISOString(),
  };
}

/**
 * Status at `now`, computed from the stored target timestamp (never from an
 * in-memory countdown). `msRemaining` is negative when overdue.
 */
export function nextFeedingPhase(
  next: Extract<NextFeeding, { state: "scheduled" }>,
  now: number,
): { phase: NextFeedingPhase; msRemaining: number } {
  const msRemaining = Date.parse(next.nextFeedingAt) - now;
  if (next.lastFeeding.status === "active") return { phase: "in-progress", msRemaining };
  return { phase: msRemaining < 0 ? "overdue" : "upcoming", msRemaining };
}
