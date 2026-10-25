import { describe, expect, it } from "vitest";
import { buildDashboard } from "../domain/dashboard.js";
import {
  computeNextFeeding,
  isNightMinute,
  nextFeedingPhase,
  type NextFeeding,
} from "../domain/schedule.js";
import {
  DEFAULT_FEEDING_SCHEDULE_SETTINGS,
  FeedingScheduleSettingsSchema,
  type FeedingScheduleSettings,
} from "../schemas/schedule.js";
import { bottle, breast, feeding, pumping } from "./fixtures.js";

const MIN = 60_000;
const defaults = DEFAULT_FEEDING_SCHEDULE_SETTINGS;
const withNight = (overrides: Partial<FeedingScheduleSettings> = {}): FeedingScheduleSettings => ({
  ...defaults,
  nightModeEnabled: true,
  nightIntervalMinutes: 240,
  nightStartsAt: "23:00",
  nightEndsAt: "07:00",
  ...overrides,
});
const scheduled = (next: NextFeeding) => {
  if (next.state !== "scheduled") throw new Error("expected a schedule");
  return next;
};

describe("computeNextFeeding — start-to-start intervals", () => {
  it("schedules 3 hours after the latest feeding's start, not its end", () => {
    // 10:00–10:40 CET (09:00Z–09:40Z on 1 Dec).
    const latest = feeding([
      breast("left", "2026-12-01T09:00:00.000Z", "2026-12-01T09:40:00.000Z"),
    ]);
    const earlier = feeding([bottle("formula", 60, 60, "2026-12-01T06:00:00.000Z")]);
    const next = scheduled(computeNextFeeding([earlier, latest], defaults));
    expect(next.lastFeeding.id).toBe(latest.id);
    expect(next.nextFeedingAt).toBe("2026-12-01T12:00:00.000Z");
    expect(next).toMatchObject({ mode: "day", intervalMinutes: 180 });
  });

  it("uses the configured day interval", () => {
    const latest = feeding([bottle("formula", 60, 60, "2026-12-01T09:00:00.000Z")]);
    const next = scheduled(computeNextFeeding([latest], { ...defaults, dayIntervalMinutes: 150 }));
    expect(next.nextFeedingAt).toBe("2026-12-01T11:30:00.000Z");
  });

  it("returns no-history when there are no feedings", () => {
    expect(computeNextFeeding([], defaults)).toEqual({ state: "no-history", settings: defaults });
  });
});

describe("computeNextFeeding — night mode", () => {
  it("does not apply a night interval unless explicitly enabled", () => {
    const night = feeding([bottle("formula", 60, 60, "2026-12-01T01:00:00.000Z")]); // 02:00 CET
    const next = scheduled(computeNextFeeding([night], { ...defaults, nightIntervalMinutes: 300 }));
    expect(next).toMatchObject({ mode: "day", intervalMinutes: 180 });
  });

  it("uses the night interval for a feeding that started at night", () => {
    const night = feeding([bottle("formula", 60, 60, "2026-12-01T01:00:00.000Z")]); // 02:00 CET
    const next = scheduled(computeNextFeeding([night], withNight()));
    expect(next).toMatchObject({ mode: "night", intervalMinutes: 240 });
    expect(next.nextFeedingAt).toBe("2026-12-01T05:00:00.000Z");
  });

  it("decides the mode by the last feeding's start time, even if the target falls in the day", () => {
    // 05:30 CET start is night; target 09:30 is daytime but keeps the night interval.
    const late = feeding([bottle("formula", 60, 60, "2026-12-01T04:30:00.000Z")]);
    expect(scheduled(computeNextFeeding([late], withNight()))).toMatchObject({
      mode: "night",
      nextFeedingAt: "2026-12-01T08:30:00.000Z",
    });
    // 21:00 CET start is day; target 00:00 falls at night but keeps the day interval.
    const evening = feeding([bottle("formula", 60, 60, "2026-12-01T20:00:00.000Z")]);
    expect(scheduled(computeNextFeeding([evening], withNight()))).toMatchObject({
      mode: "day",
      intervalMinutes: 180,
    });
  });

  it("treats the night start as inclusive and the night end as exclusive", () => {
    expect(isNightMinute(23 * 60, "23:00", "07:00")).toBe(true);
    expect(isNightMinute(23 * 60 - 1, "23:00", "07:00")).toBe(false);
    expect(isNightMinute(7 * 60 - 1, "23:00", "07:00")).toBe(true);
    expect(isNightMinute(7 * 60, "23:00", "07:00")).toBe(false);
    expect(isNightMinute(0, "23:00", "07:00")).toBe(true);
    // Non-wrapping window.
    expect(isNightMinute(1 * 60, "00:30", "05:00")).toBe(true);
    expect(isNightMinute(6 * 60, "00:30", "05:00")).toBe(false);

    const atBoundary = feeding([bottle("formula", 60, 60, "2026-12-01T22:00:00.000Z")]); // 23:00 CET
    expect(scheduled(computeNextFeeding([atBoundary], withNight())).mode).toBe("night");
    const atEnd = feeding([bottle("formula", 60, 60, "2026-12-01T06:00:00.000Z")]); // 07:00 CET
    expect(scheduled(computeNextFeeding([atEnd], withNight())).mode).toBe("day");
  });

  it("rejects a night window that starts and ends at the same time", () => {
    expect(
      FeedingScheduleSettingsSchema.safeParse(
        withNight({ nightStartsAt: "22:00", nightEndsAt: "22:00" }),
      ).success,
    ).toBe(false);
  });
});

describe("computeNextFeeding — midnight and DST", () => {
  it("schedules across midnight from a feeding that crosses midnight", () => {
    // 23:30–00:20 CET; next at 02:30 CET the following day.
    const latest = feeding([
      breast("left", "2026-12-01T22:30:00.000Z", "2026-12-01T23:20:00.000Z"),
    ]);
    expect(scheduled(computeNextFeeding([latest], defaults)).nextFeedingAt).toBe(
      "2026-12-02T01:30:00.000Z",
    );
  });

  it("keeps a true 3-hour interval across the end of DST (clocks go back)", () => {
    // 01:30 CEST on 25 Oct 2026 = 23:30Z on the 24th. Three real hours later is
    // 02:30Z = 03:30 CET (wall clock shows 2 h jump because 02:00–03:00 repeats).
    const latest = feeding([bottle("formula", 60, 60, "2026-10-24T23:30:00.000Z")]);
    expect(scheduled(computeNextFeeding([latest], defaults)).nextFeedingAt).toBe(
      "2026-10-25T02:30:00.000Z",
    );
  });

  it("keeps a true 3-hour interval across the start of DST (clocks go forward)", () => {
    // 01:30 CET on 29 Mar 2026 = 00:30Z; 3 h later is 03:30Z = 05:30 CEST.
    const latest = feeding([bottle("formula", 60, 60, "2026-03-29T00:30:00.000Z")]);
    expect(scheduled(computeNextFeeding([latest], defaults)).nextFeedingAt).toBe(
      "2026-03-29T03:30:00.000Z",
    );
  });

  it("uses local (Amsterdam) wall time for the night window in summer and winter", () => {
    const settings = withNight();
    // 23:30 CEST in summer = 21:30Z.
    const summer = feeding([bottle("formula", 60, 60, "2026-07-01T21:30:00.000Z")]);
    expect(scheduled(computeNextFeeding([summer], settings)).mode).toBe("night");
    // 22:30Z in summer is 00:30 CEST (night); 21:30Z in winter is 22:30 CET (day).
    const winter = feeding([bottle("formula", 60, 60, "2026-12-01T21:30:00.000Z")]);
    expect(scheduled(computeNextFeeding([winter], settings)).mode).toBe("day");
  });
});

describe("computeNextFeeding — history changes", () => {
  const first = feeding([bottle("formula", 60, 60, "2026-12-01T06:00:00.000Z")]);
  const second = feeding([bottle("formula", 60, 60, "2026-12-01T09:00:00.000Z")]);

  it("recalculates when the latest feeding is edited", () => {
    const edited = { ...second, startedAt: "2026-12-01T09:45:00.000Z" };
    expect(scheduled(computeNextFeeding([first, edited], defaults)).nextFeedingAt).toBe(
      "2026-12-01T12:45:00.000Z",
    );
  });

  it("falls back to the previous feeding when the latest is deleted", () => {
    expect(scheduled(computeNextFeeding([first], defaults)).nextFeedingAt).toBe(
      "2026-12-01T09:00:00.000Z",
    );
  });

  it("ignores pumping sessions", () => {
    const data = {
      feedingSessions: [first],
      pumpingSessions: [pumping("2026-12-01T08:00:00.000Z", 50, 40)],
    };
    const dashboard = buildDashboard(data, "2026-12-01", Date.parse("2026-12-01T10:00:00.000Z"));
    expect(scheduled(dashboard.nextFeeding).lastFeeding.id).toBe(first.id);
    expect(scheduled(dashboard.nextFeeding).nextFeedingAt).toBe("2026-12-01T09:00:00.000Z");
  });
});

describe("nextFeedingPhase", () => {
  const latest = feeding([bottle("formula", 60, 60, "2026-12-01T09:00:00.000Z")]);
  const next = scheduled(computeNextFeeding([latest], defaults));

  it("is upcoming before the target and overdue after it", () => {
    expect(nextFeedingPhase(next, Date.parse("2026-12-01T11:15:00.000Z"))).toEqual({
      phase: "upcoming",
      msRemaining: 45 * MIN,
    });
    expect(nextFeedingPhase(next, Date.parse("2026-12-01T12:20:00.000Z"))).toEqual({
      phase: "overdue",
      msRemaining: -20 * MIN,
    });
  });

  it("shows an active feeding as in progress while keeping the target", () => {
    const active = feeding([breast("right", "2026-12-01T12:30:00.000Z", null)], {
      status: "active",
      endedAt: null,
    });
    const live = scheduled(computeNextFeeding([latest, active], defaults));
    expect(live.lastFeeding).toMatchObject({ id: active.id, status: "active" });
    expect(live.nextFeedingAt).toBe("2026-12-01T15:30:00.000Z");
    expect(nextFeedingPhase(live, Date.parse("2026-12-01T12:40:00.000Z")).phase).toBe(
      "in-progress",
    );
  });
});
