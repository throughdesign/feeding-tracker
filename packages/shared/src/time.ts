/**
 * Time helpers. All timestamps are stored as UTC ISO strings; calendar days and
 * wall-clock display use the family's timezone (Europe/Amsterdam), regardless of
 * the timezone of the machine running the code.
 */

export const APP_TIMEZONE = "Europe/Amsterdam";

const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const LOCAL_INPUT_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;

const partsFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

function zonedParts(epochMs: number): ZonedParts {
  const parts: Record<string, string> = {};
  for (const part of partsFormatter.formatToParts(new Date(epochMs))) {
    parts[part.type] = part.value;
  }
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

/** Offset of the app timezone from UTC at the given instant, in milliseconds. */
function zoneOffsetMs(epochMs: number): number {
  const p = zonedParts(epochMs);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(epochMs / 1000) * 1000;
}

/** Converts a wall-clock time in the app timezone to a UTC epoch. */
function zonedWallTimeToEpoch(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second = 0,
): number {
  const wallAsUtc = Date.UTC(year, month - 1, day, hour, minute, second);
  // Two passes resolve the offset correctly around DST transitions.
  let epoch = wallAsUtc - zoneOffsetMs(wallAsUtc);
  epoch = wallAsUtc - zoneOffsetMs(epoch);
  return epoch;
}

const pad = (n: number) => String(n).padStart(2, "0");

export function isValidDateKey(value: string): boolean {
  const match = DATE_KEY_PATTERN.exec(value);
  if (!match) return false;
  const [, y, m, d] = match.map(Number) as [number, number, number, number];
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

function parseDateKey(dateKey: string): [number, number, number] {
  if (!isValidDateKey(dateKey)) throw new RangeError(`Invalid date key: ${dateKey}`);
  const [y, m, d] = dateKey.split("-").map(Number) as [number, number, number];
  return [y, m, d];
}

/** Calendar date (YYYY-MM-DD) of an instant in the app timezone. */
export function dateKeyInZone(instant: string | number | Date): string {
  const p = zonedParts(new Date(instant).getTime());
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

/** UTC bounds [start, end) of a calendar day in the app timezone. */
export function zonedDayBounds(dateKey: string): { start: string; end: string } {
  const [y, m, d] = parseDateKey(dateKey);
  const next = new Date(Date.UTC(y, m - 1, d + 1));
  return {
    start: new Date(zonedWallTimeToEpoch(y, m, d, 0, 0)).toISOString(),
    end: new Date(
      zonedWallTimeToEpoch(next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate(), 0, 0),
    ).toISOString(),
  };
}

export function addDays(dateKey: string, days: number): string {
  const [y, m, d] = parseDateKey(dateKey);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

/** Value for `<input type="datetime-local">`, expressed in the app timezone. */
export function toZonedInputValue(iso: string): string {
  const p = zonedParts(Date.parse(iso));
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
}

/** Parses a `datetime-local` value in the app timezone into a UTC ISO string. */
export function fromZonedInputValue(value: string): string | null {
  const match = LOCAL_INPUT_PATTERN.exec(value);
  if (!match) return null;
  const [, y, mo, d, h, mi, s] = match;
  const epoch = zonedWallTimeToEpoch(
    Number(y),
    Number(mo),
    Number(d),
    Number(h),
    Number(mi),
    Number(s ?? 0),
  );
  return Number.isNaN(epoch) ? null : new Date(epoch).toISOString();
}

/** Current instant as a UTC ISO string. */
export function nowIso(): string {
  return new Date().toISOString();
}
