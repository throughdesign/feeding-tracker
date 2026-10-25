import {
  APP_TIMEZONE,
  type BottleMilkType,
  type BreastSide,
  type PumpingTotal,
} from "@isaac/shared";

const timeFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: APP_TIMEZONE,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

const dayFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "UTC",
  weekday: "long",
  day: "numeric",
  month: "long",
});

/** 24-hour wall-clock time in Europe/Amsterdam, e.g. "03:45". */
export function formatTime(iso: string): string {
  return timeFormatter.format(new Date(iso));
}

export function formatTimeRange(startedAt: string, endedAt: string | null): string {
  if (!endedAt) return `${formatTime(startedAt)} – now`;
  const start = formatTime(startedAt);
  const end = formatTime(endedAt);
  return start === end ? start : `${start} – ${end}`;
}

/** Formats a YYYY-MM-DD calendar date, e.g. "Sunday 25 October". */
export function formatDateKey(dateKey: string): string {
  return dayFormatter.format(new Date(`${dateKey}T12:00:00Z`));
}

/** Whole minutes, rounded, e.g. "12 min". */
export function formatMinutes(ms: number): string {
  return `${Math.round(ms / 60_000)} min`;
}

/** Live timer display, e.g. "07:32" or "1:02:05". */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(h ? 2 : 2, "0");
  const ss = String(s).padStart(2, "0");
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** Duration in hours and minutes, e.g. "1 h 25 min", "40 min", "3 h". */
export function formatHoursMinutes(ms: number): string {
  const minutes = Math.floor(Math.abs(ms) / 60_000);
  if (minutes < 1) return "less than a minute";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
}

/** Relative age, e.g. "2 h 10 min ago". */
export function formatAgo(iso: string, now: number): string {
  const minutes = Math.max(0, Math.round((now - Date.parse(iso)) / 60_000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${m} min ago` : `${h} h ago`;
}

export const breastLabel: Record<BreastSide, string> = { left: "Left", right: "Right" };

export const milkTypeLabel: Record<BottleMilkType, string> = {
  expressed_breast_milk: "Expressed milk",
  formula: "Formula",
};

export function formatMl(value: number): string {
  return `${Math.round(value * 10) / 10} ml`;
}

export function formatVolume(value: number | null): string {
  return value === null ? "not measured" : formatMl(value);
}

/** Never presents a partial subtotal as the total. */
export function formatPumpingTotal(total: PumpingTotal): string {
  switch (total.kind) {
    case "complete":
      return formatMl(total.totalMl);
    case "partial":
      return `${formatMl(total.knownMl)} + ${breastLabel[total.unknownSide].toLowerCase()} not measured`;
    case "unknown":
      return "Not measured";
  }
}
