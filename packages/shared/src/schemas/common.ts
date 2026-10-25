import { z } from "zod";

/** UTC ISO-8601 timestamp, e.g. 2026-10-25T09:00:00.000Z. Offsets are rejected. */
export const IsoDateTimeSchema = z.iso.datetime({ message: "Expected a UTC ISO timestamp" });

export const IdSchema = z.uuid();

/** Person ids are human-readable seeds ("mother", "isaac") or UUIDs. */
export const PersonIdSchema = z.string().min(1).max(64);

export const MAX_VOLUME_ML = 1000;

/** Measured volume. `0` is a real measurement; unknown is represented by `null` at use sites. */
export const VolumeMlSchema = z
  .number({ message: "Expected a volume in ml" })
  .finite()
  .min(0, "Volume cannot be negative")
  .max(MAX_VOLUME_ML, `Volume cannot exceed ${MAX_VOLUME_ML} ml`);

export const NotesSchema = z.string().trim().max(2000).optional();

export const DateKeySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected a date formatted as YYYY-MM-DD");

export function isBefore(a: string, b: string): boolean {
  return Date.parse(a) < Date.parse(b);
}
