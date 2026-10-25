import { breastfeedingDurationMs, type FeedingWithSummary } from "@isaac/shared";
import { breastLabel, formatMinutes, formatMl, milkTypeLabel } from "../../lib/format";

/** Short type label that does not rely on color, e.g. "Breastfeeding + formula". */
export function feedingTitle(feeding: FeedingWithSummary): string {
  const parts: string[] = [];
  if (feeding.summary.hasBreastfeeding) parts.push("Breastfeeding");
  const milkTypes = new Set(
    feeding.segments.flatMap((s) => (s.type === "bottle" ? [s.milkType] : [])),
  );
  for (const type of milkTypes) {
    parts.push(parts.length ? milkTypeLabel[type].toLowerCase() : `${milkTypeLabel[type]} bottle`);
  }
  return parts.join(" + ") || "Feeding";
}

/** One human-readable line per segment, in chronological order. */
export function feedingDetails(feeding: FeedingWithSummary, now: number): string[] {
  return feeding.segments.map((segment) => {
    if (segment.type === "breastfeeding") {
      const pauses = segment.pauses.length
        ? ` · ${segment.pauses.length} pause${segment.pauses.length > 1 ? "s" : ""}`
        : "";
      const running = segment.endedAt === null ? " (running)" : "";
      return `${breastLabel[segment.breast]} breast ${formatMinutes(breastfeedingDurationMs(segment, now))}${running}${pauses}`;
    }
    return `${milkTypeLabel[segment.milkType]}: drank ${formatMl(segment.consumedMl)} of ${formatMl(segment.offeredMl)}`;
  });
}
