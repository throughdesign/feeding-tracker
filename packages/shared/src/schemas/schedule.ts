import { z } from "zod";
import { APP_TIMEZONE } from "../time.js";

/** Local time of day, "HH:mm" (24-hour). */
export const TimeOfDaySchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Expected a time formatted as HH:mm");

export const MIN_INTERVAL_MINUTES = 60;
export const MAX_INTERVAL_MINUTES = 8 * 60;

const IntervalSchema = z
  .number()
  .int()
  .min(MIN_INTERVAL_MINUTES, `At least ${MIN_INTERVAL_MINUTES} minutes`)
  .max(MAX_INTERVAL_MINUTES, `At most ${MAX_INTERVAL_MINUTES} minutes`);

const scheduleFields = {
  /** Start-to-start interval during the day. */
  dayIntervalMinutes: IntervalSchema,
  /** Start-to-start interval at night; only used when `nightModeEnabled`. */
  nightIntervalMinutes: IntervalSchema,
  nightModeEnabled: z.boolean(),
  /** Night begins at this local time (inclusive). */
  nightStartsAt: TimeOfDaySchema,
  /** Night ends at this local time (exclusive). May be earlier than `nightStartsAt` (wraps midnight). */
  nightEndsAt: TimeOfDaySchema,
  /** Only Europe/Amsterdam is supported for now. */
  timezone: z.literal(APP_TIMEZONE),
  /** Persisted for future notifications; no reminders are delivered yet. */
  remindersEnabled: z.boolean(),
};

function checkNightWindow(
  value: { nightStartsAt?: string; nightEndsAt?: string },
  ctx: z.RefinementCtx,
): void {
  if (value.nightStartsAt && value.nightStartsAt === value.nightEndsAt) {
    ctx.addIssue({
      code: "custom",
      path: ["nightEndsAt"],
      message: "Night must end at a different time than it starts",
    });
  }
}

export const FeedingScheduleSettingsSchema = z
  .object(scheduleFields)
  .strict()
  .superRefine(checkNightWindow);

/** Partial update; the merged settings are re-validated. */
export const UpdateFeedingScheduleSettingsInputSchema = z
  .object(scheduleFields)
  .omit({ timezone: true })
  .partial()
  .strict();

export type FeedingScheduleSettings = z.infer<typeof FeedingScheduleSettingsSchema>;
export type UpdateFeedingScheduleSettingsInput = z.input<
  typeof UpdateFeedingScheduleSettingsInputSchema
>;

/** Defaults: 3 hours, day and night. A longer night interval is never enabled automatically. */
export const DEFAULT_FEEDING_SCHEDULE_SETTINGS: FeedingScheduleSettings = {
  dayIntervalMinutes: 180,
  nightIntervalMinutes: 180,
  nightModeEnabled: false,
  nightStartsAt: "23:00",
  nightEndsAt: "07:00",
  timezone: APP_TIMEZONE,
  remindersEnabled: false,
};

/** Persisted app settings. Optional in the data file for backward compatibility. */
export const SettingsSchema = z
  .object({ feedingSchedule: FeedingScheduleSettingsSchema.optional() })
  .strict();
