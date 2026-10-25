const weekdayDay = new Intl.DateTimeFormat("en-GB", {
  timeZone: "UTC",
  weekday: "short",
  day: "numeric",
});
const longDay = new Intl.DateTimeFormat("en-GB", {
  timeZone: "UTC",
  weekday: "long",
  day: "numeric",
  month: "long",
});
const shortRange = new Intl.DateTimeFormat("en-GB", {
  timeZone: "UTC",
  day: "numeric",
  month: "short",
});

const noon = (dateKey: string) => new Date(`${dateKey}T12:00:00Z`);

/** Axis label, e.g. "Mon 26". */
export const formatDayShort = (dateKey: string) => weekdayDay.format(noon(dateKey));
/** Tooltip / table label, e.g. "Monday 26 October". */
export const formatDayLong = (dateKey: string) => longDay.format(noon(dateKey));
const mediumDay = new Intl.DateTimeFormat("en-GB", {
  timeZone: "UTC",
  weekday: "short",
  day: "numeric",
  month: "short",
});
/** Table label, e.g. "Mon 26 Oct". */
export const formatDayMedium = (dateKey: string) => mediumDay.format(noon(dateKey));
export const formatRange = (start: string, end: string) =>
  `${shortRange.format(noon(start))} – ${shortRange.format(noon(end))}`;

export const msToMinutes = (ms: number) => Math.round(ms / 60_000);

/** "07:30" from minutes since midnight. */
export function formatClockMinute(minute: number): string {
  const m = Math.max(0, Math.min(1440, Math.round(minute)));
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}
