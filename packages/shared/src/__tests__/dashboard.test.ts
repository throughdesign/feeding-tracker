import { describe, expect, it } from "vitest";
import { buildDashboard } from "../domain/dashboard.js";
import { bottle, breast, feeding, pumping } from "./fixtures.js";

const MIN = 60_000;

describe("buildDashboard", () => {
  // 25 Oct 2026 in Amsterdam: 2026-10-24T22:00Z .. 2026-10-25T23:00Z (DST ends).
  const data = {
    feedingSessions: [
      feeding([
        breast("left", "2026-10-25T06:00:00.000Z", "2026-10-25T06:12:00.000Z"),
        breast("right", "2026-10-25T06:12:00.000Z", "2026-10-25T06:20:00.000Z", [
          { startedAt: "2026-10-25T06:15:00.000Z", endedAt: "2026-10-25T06:16:00.000Z" },
        ]),
        bottle("formula", 40, 30, "2026-10-25T06:25:00.000Z"),
      ]),
      feeding([bottle("expressed_breast_milk", 90, 80, "2026-10-25T12:00:00.000Z")]),
      // Starts 23:50 local on the 25th (22:50Z) and crosses midnight.
      feeding([breast("left", "2026-10-25T22:50:00.000Z", "2026-10-25T23:20:00.000Z")]),
      // Previous day (local 23:30 on the 24th = 21:30Z).
      feeding([bottle("formula", 100, 100, "2026-10-24T21:30:00.000Z")]),
    ],
    pumpingSessions: [
      pumping("2026-10-25T07:00:00.000Z", 40, 35),
      pumping("2026-10-25T13:00:00.000Z", 0, null),
      pumping("2026-10-25T23:30:00.000Z", 50, 50), // next local day
    ],
  };

  const dashboard = buildDashboard(data, "2026-10-25", Date.parse("2026-10-26T08:00:00.000Z"));

  it("counts feedings by their local start day, including ones crossing midnight", () => {
    expect(dashboard.feeding.sessionCount).toBe(3);
    expect(dashboard.feeding.breastfeeding.totalMs).toBe((12 + 7 + 30) * MIN);
    expect(dashboard.feeding.breastfeeding.leftMs).toBe(42 * MIN);
    expect(dashboard.feeding.breastfeeding.sessionCount).toBe(2);
  });

  it("aggregates measured bottle consumption by milk type only", () => {
    expect(dashboard.feeding.bottle).toEqual({
      count: 2,
      offeredMl: 130,
      consumedMl: 110,
      expressedBreastMilkMl: 80,
      formulaMl: 30,
    });
  });

  it("sums known pumped volume and flags unknown sides", () => {
    expect(dashboard.pumping).toEqual({
      sessionCount: 2,
      knownVolumeMl: 75,
      leftMl: 40,
      rightMl: 35,
      sessionsWithUnknownVolume: 1,
    });
  });

  it("builds a chronological timeline", () => {
    expect(dashboard.timeline.map((i) => i.kind)).toEqual([
      "feeding",
      "pumping",
      "feeding",
      "pumping",
      "feeding",
    ]);
    const starts = dashboard.timeline.map((i) => Date.parse(i.startedAt));
    expect([...starts].sort((a, b) => a - b)).toEqual(starts);
  });

  it("reports the most recent feeding overall", () => {
    expect(dashboard.mostRecentFeeding?.startedAt).toBe("2026-10-25T22:50:00.000Z");
    expect(dashboard.activeFeeding).toBeNull();
  });

  it("counts an ongoing active feed up to now", () => {
    const active = feeding([breast("right", "2026-10-25T09:00:00.000Z", null)], {
      status: "active",
      endedAt: null,
    });
    const live = buildDashboard(
      { feedingSessions: [active], pumpingSessions: [] },
      "2026-10-25",
      Date.parse("2026-10-25T09:09:00.000Z"),
    );
    expect(live.activeFeeding?.id).toBe(active.id);
    expect(live.feeding.breastfeeding.rightMs).toBe(9 * MIN);
  });
});
