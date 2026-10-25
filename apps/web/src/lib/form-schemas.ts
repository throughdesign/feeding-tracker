import { MAX_VOLUME_ML, fromZonedInputValue, toZonedInputValue } from "@isaac/shared";
import { z } from "zod";

/** `datetime-local` value in Europe/Amsterdam time. */
export const localDateTime = z
  .string()
  .min(1, "Required")
  .refine((v) => fromZonedInputValue(v) !== null, "Enter a valid date and time");

/** A number of ml; empty is allowed here and rejected by `requiredVolume`. */
const optionalVolume = z
  .string()
  .trim()
  .refine(
    (v) => v === "" || (!Number.isNaN(Number(v)) && Number(v) >= 0),
    "Enter a volume of 0 or more",
  )
  .refine((v) => v === "" || Number(v) <= MAX_VOLUME_ML, `At most ${MAX_VOLUME_ML} ml`);

export const requiredVolume = optionalVolume.refine((v) => v !== "", "Required");

export function toIso(value: string): string {
  const iso = fromZonedInputValue(value);
  if (!iso) throw new Error(`Invalid date/time: ${value}`);
  return iso;
}

/**
 * `datetime-local` inputs have minute precision. When the user leaves a field
 * unchanged, keep the original timestamp so seconds (and ordering) survive.
 */
export function toIsoKeeping(value: string, original: string | null | undefined): string {
  if (original && toZonedInputValue(original) === value) return original;
  return toIso(value);
}

export function endNotBeforeStart(
  value: { startedAt: string; endedAt: string },
  ctx: z.RefinementCtx,
): void {
  const start = fromZonedInputValue(value.startedAt);
  const end = fromZonedInputValue(value.endedAt);
  if (start && end && Date.parse(end) < Date.parse(start)) {
    ctx.addIssue({ code: "custom", path: ["endedAt"], message: "End must be after start" });
  }
}
