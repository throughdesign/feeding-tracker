import type {
  BreastSide,
  BreastfeedingSegment,
  FeedingSegmentInput,
  FeedingSession,
  FeedingSummary,
} from "../types/index.js";

type BreastSegmentLike = Pick<BreastfeedingSegment, "startedAt" | "endedAt" | "pauses">;

/**
 * Time actually spent feeding on a breast: segment span minus pauses. Open
 * segments and open pauses run until `now`. Pauses are clipped to the segment.
 */
export function breastfeedingDurationMs(
  segment: BreastSegmentLike,
  now: number = Date.now(),
): number {
  const start = Date.parse(segment.startedAt);
  const end = segment.endedAt ? Date.parse(segment.endedAt) : Math.max(now, start);
  let total = Math.max(0, end - start);
  for (const pause of segment.pauses) {
    const pauseStart = Math.max(start, Date.parse(pause.startedAt));
    const pauseEnd = Math.min(end, pause.endedAt ? Date.parse(pause.endedAt) : end);
    if (pauseEnd > pauseStart) total -= pauseEnd - pauseStart;
  }
  return Math.max(0, total);
}

export function isSegmentPaused(segment: BreastSegmentLike): boolean {
  const last = segment.pauses.at(-1);
  return segment.endedAt === null && last !== undefined && last.endedAt === null;
}

export function summarizeFeeding(
  session: Pick<FeedingSession, "segments">,
  now: number = Date.now(),
): FeedingSummary {
  const summary: FeedingSummary = {
    breastfeeding: { leftMs: 0, rightMs: 0, totalMs: 0 },
    bottle: { count: 0, offeredMl: 0, consumedMl: 0, expressedBreastMilkMl: 0, formulaMl: 0 },
    hasBreastfeeding: false,
    hasBottle: false,
  };
  for (const segment of session.segments) {
    if (segment.type === "breastfeeding") {
      const ms = breastfeedingDurationMs(segment, now);
      summary.hasBreastfeeding = true;
      summary.breastfeeding.totalMs += ms;
      if (segment.breast === "left") summary.breastfeeding.leftMs += ms;
      else summary.breastfeeding.rightMs += ms;
    } else {
      summary.hasBottle = true;
      summary.bottle.count += 1;
      summary.bottle.offeredMl += segment.offeredMl;
      summary.bottle.consumedMl += segment.consumedMl;
      if (segment.milkType === "expressed_breast_milk") {
        summary.bottle.expressedBreastMilkMl += segment.consumedMl;
      } else {
        summary.bottle.formulaMl += segment.consumedMl;
      }
    }
  }
  return summary;
}

/**
 * Session bounds follow their segments: the session starts with its earliest
 * segment and, once completed, ends with its latest one.
 */
export function deriveSessionBounds(
  segments: Pick<FeedingSegmentInput, "startedAt" | "endedAt">[],
  status: FeedingSession["status"],
): { startedAt: string; endedAt: string | null } | null {
  if (segments.length === 0) return null;
  const starts = segments.map((s) => Date.parse(s.startedAt));
  const ends = segments.map((s) => (s.endedAt ? Date.parse(s.endedAt) : Number.NaN));
  const startedAt = new Date(Math.min(...starts)).toISOString();
  if (status === "active") return { startedAt, endedAt: null };
  const knownEnds = ends.filter((e) => !Number.isNaN(e));
  const endedAt = knownEnds.length ? new Date(Math.max(...knownEnds)).toISOString() : null;
  return { startedAt, endedAt };
}

export function sortSegments<T extends Pick<FeedingSegmentInput, "startedAt">>(segments: T[]): T[] {
  return [...segments].sort((a, b) => Date.parse(a.startedAt) - Date.parse(b.startedAt));
}

// ---------------------------------------------------------------------------
// Live timer transitions. Pure functions over the segment list; the resulting
// list is persisted to the backend, which is the single source of truth.
// ---------------------------------------------------------------------------

type Segments = FeedingSegmentInput[];
type BreastInput = Extract<FeedingSegmentInput, { type: "breastfeeding" }>;

function isOpenBreast(segment: FeedingSegmentInput): segment is BreastInput {
  return segment.type === "breastfeeding" && segment.endedAt === null;
}

export function openBreastSegment(segments: Segments): BreastInput | undefined {
  return segments.find(isOpenBreast);
}

function closeSegment(segment: BreastInput, at: string): BreastInput {
  return {
    ...segment,
    endedAt: at,
    pauses: segment.pauses.map((p) => (p.endedAt === null ? { ...p, endedAt: at } : p)),
  };
}

/** Stops whichever breast is being timed, closing any open pause. */
export function stopBreast(segments: Segments, at: string): Segments {
  return segments.map((s) => (isOpenBreast(s) ? closeSegment(s, at) : s));
}

/** Starts timing a breast, stopping the currently timed breast first. */
export function startBreast(segments: Segments, breast: BreastSide, at: string): Segments {
  return [
    ...stopBreast(segments, at),
    { type: "breastfeeding", breast, startedAt: at, endedAt: null, pauses: [] },
  ];
}

export function switchBreast(segments: Segments, at: string): Segments {
  const current = openBreastSegment(segments);
  const lastBreast = [...segments].reverse().find((s) => s.type === "breastfeeding") as
    BreastInput | undefined;
  const from = current?.breast ?? lastBreast?.breast ?? "right";
  return startBreast(segments, from === "left" ? "right" : "left", at);
}

export function pauseBreast(segments: Segments, at: string): Segments {
  return segments.map((s) =>
    isOpenBreast(s) && !isSegmentPaused(s)
      ? { ...s, pauses: [...s.pauses, { startedAt: at, endedAt: null }] }
      : s,
  );
}

export function resumeBreast(segments: Segments, at: string): Segments {
  return segments.map((s) =>
    isOpenBreast(s)
      ? { ...s, pauses: s.pauses.map((p) => (p.endedAt === null ? { ...p, endedAt: at } : p)) }
      : s,
  );
}

/** Closes every open segment so the session can be marked completed. */
export function finishSegments(segments: Segments, at: string): Segments {
  return stopBreast(segments, at).map((s) =>
    s.type === "bottle" && s.endedAt === null ? { ...s, endedAt: at } : s,
  );
}
