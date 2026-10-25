import { describe, expect, it } from "vitest";
import {
  breastfeedingDurationMs,
  deriveSessionBounds,
  finishSegments,
  isSegmentPaused,
  pauseBreast,
  resumeBreast,
  startBreast,
  summarizeFeeding,
  switchBreast,
} from "../domain/feeding.js";
import { FeedingSessionSchema } from "../schemas/feeding.js";
import type { FeedingSegmentInput } from "../types/index.js";
import { bottle, breast, feeding } from "./fixtures.js";

const MIN = 60_000;
const at = (hhmm: string) => `2026-10-25T${hhmm}:00.000Z`;

describe("breastfeedingDurationMs", () => {
  it("measures a finished segment", () => {
    expect(breastfeedingDurationMs(breast("left", at("10:00"), at("10:12")))).toBe(12 * MIN);
  });

  it("excludes completed pauses", () => {
    const seg = breast("left", at("10:00"), at("10:20"), [
      { startedAt: at("10:05"), endedAt: at("10:08") },
      { startedAt: at("10:15"), endedAt: at("10:16") },
    ]);
    expect(breastfeedingDurationMs(seg)).toBe(16 * MIN);
  });

  it("runs an active segment until now", () => {
    const seg = breast("right", at("10:00"), null);
    expect(breastfeedingDurationMs(seg, Date.parse(at("10:07")))).toBe(7 * MIN);
  });

  it("freezes the timer during an open pause", () => {
    const seg = breast("right", at("10:00"), null, [{ startedAt: at("10:05"), endedAt: null }]);
    expect(isSegmentPaused(seg)).toBe(true);
    expect(breastfeedingDurationMs(seg, Date.parse(at("10:30")))).toBe(5 * MIN);
  });

  it("clips pauses that extend beyond the segment", () => {
    const seg = breast("left", at("10:00"), at("10:10"), [
      { startedAt: at("09:55"), endedAt: at("10:02") },
    ]);
    expect(breastfeedingDurationMs(seg)).toBe(8 * MIN);
  });

  it("handles segments crossing midnight", () => {
    const seg = breast("left", "2026-10-25T22:50:00.000Z", "2026-10-25T23:15:00.000Z");
    expect(breastfeedingDurationMs(seg)).toBe(25 * MIN);
  });
});

describe("summarizeFeeding", () => {
  it("separates breast time from measured bottle volumes", () => {
    const summary = summarizeFeeding(
      feeding([
        breast("left", at("10:00"), at("10:10")),
        breast("right", at("10:10"), at("10:18")),
        bottle("formula", 60, 45, at("10:20")),
        bottle("expressed_breast_milk", 30, 30, at("10:25")),
      ]),
    );
    expect(summary.breastfeeding).toEqual({
      leftMs: 10 * MIN,
      rightMs: 8 * MIN,
      totalMs: 18 * MIN,
    });
    expect(summary.bottle).toEqual({
      count: 2,
      offeredMl: 90,
      consumedMl: 75,
      expressedBreastMilkMl: 30,
      formulaMl: 45,
    });
    expect(summary).not.toHaveProperty("totalMl");
  });
});

describe("FeedingSessionSchema validation", () => {
  it("accepts breastfeeding followed by a formula supplement", () => {
    const session = feeding([
      breast("left", at("10:00"), at("10:10")),
      bottle("formula", 60, 40, at("10:15")),
    ]);
    expect(FeedingSessionSchema.safeParse(session).success).toBe(true);
  });

  it("rejects consumed volume above offered volume", () => {
    const result = FeedingSessionSchema.safeParse(
      feeding([bottle("formula", 60, 70, at("10:00"))]),
    );
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toMatch(/cannot exceed/);
  });

  it("rejects a volume on a breastfeeding segment", () => {
    const seg = { ...breast("left", at("10:00"), at("10:10")), consumedMl: 50 };
    expect(FeedingSessionSchema.safeParse(feeding([seg as never])).success).toBe(false);
  });

  it("rejects two breasts timed simultaneously", () => {
    const session = feeding(
      [breast("left", at("10:00"), null), breast("right", at("10:01"), null)],
      {
        status: "active",
        endedAt: null,
      },
    );
    expect(FeedingSessionSchema.safeParse(session).success).toBe(false);
  });

  it("rejects a completed session with an open segment", () => {
    const session = feeding([breast("left", at("10:00"), null)], { endedAt: at("10:10") });
    expect(FeedingSessionSchema.safeParse(session).success).toBe(false);
  });

  it("rejects overlapping pauses", () => {
    const session = feeding([
      breast("left", at("10:00"), at("10:20"), [
        { startedAt: at("10:02"), endedAt: at("10:06") },
        { startedAt: at("10:05"), endedAt: at("10:07") },
      ]),
    ]);
    expect(FeedingSessionSchema.safeParse(session).success).toBe(false);
  });
});

describe("live timer transitions", () => {
  it("starts, pauses, resumes, switches and finishes", () => {
    let segments: FeedingSegmentInput[] = startBreast([], "left", at("10:00"));
    segments = pauseBreast(segments, at("10:04"));
    segments = pauseBreast(segments, at("10:05")); // second pause is a no-op
    segments = resumeBreast(segments, at("10:06"));
    segments = switchBreast(segments, at("10:12"));
    segments = pauseBreast(segments, at("10:15"));
    segments = finishSegments(segments, at("10:20"));

    expect(segments).toHaveLength(2);
    const [left, right] = segments as Extract<FeedingSegmentInput, { type: "breastfeeding" }>[];
    expect(left!.breast).toBe("left");
    expect(left!.pauses).toEqual([{ startedAt: at("10:04"), endedAt: at("10:06") }]);
    expect(breastfeedingDurationMs(left!)).toBe(10 * MIN);
    expect(right!.breast).toBe("right");
    expect(right!.pauses).toEqual([{ startedAt: at("10:15"), endedAt: at("10:20") }]);
    expect(breastfeedingDurationMs(right!)).toBe(3 * MIN);
    expect(deriveSessionBounds(segments, "completed")).toEqual({
      startedAt: at("10:00"),
      endedAt: at("10:20"),
    });
  });
});
