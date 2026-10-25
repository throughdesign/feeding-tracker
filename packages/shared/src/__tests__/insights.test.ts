import { describe, expect, it } from "vitest";
import { buildInsights } from "../domain/insights.js";
import { bottle, breast, feeding, pumping } from "./fixtures.js";

const MIN = 60_000;
const NOW = Date.parse("2026-10-27T12:00:00.000Z");

describe("buildInsights — period and calendar days", () => {
  it("covers exactly N Amsterdam calendar days ending on the end date", () => {
    const insights = buildInsights(
      { feedingSessions: [], pumpingSessions: [] },
      "2026-10-27",
      7,
      NOW,
    );
    expect(insights.period).toEqual({ days: 7, startDate: "2026-10-21", endDate: "2026-10-27" });
    expect(insights.feeding.days.map((d) => d.date)).toEqual([
      "2026-10-21",
      "2026-10-22",
      "2026-10-23",
      "2026-10-24",
      "2026-10-25",
      "2026-10-26",
      "2026-10-27",
    ]);
    expect(
      buildInsights({ feedingSessions: [], pumpingSessions: [] }, "2026-10-27", 14, NOW).pumping
        .days,
    ).toHaveLength(14);
  });

  it("represents days without records as null, not as measured zero", () => {
    const insights = buildInsights(
      { feedingSessions: [], pumpingSessions: [] },
      "2026-10-27",
      7,
      NOW,
    );
    expect(insights.feeding.days[0]).toEqual({
      date: "2026-10-21",
      sessionCount: 0,
      bottleCount: 0,
      expressedBreastMilkMl: null,
      formulaMl: null,
      breastfeedingMs: null,
    });
    expect(insights.pumping.days[0]).toMatchObject({
      leftMl: null,
      rightMl: null,
      measuredMl: null,
      complete: false,
    });
    expect(insights.feeding.totals.daysWithRecords).toBe(0);
  });

  it("assigns sessions to Amsterdam days at midnight and across the DST change", () => {
    const sessions = [
      // 23:30 CEST on 24 Oct (21:30Z) belongs to the 24th.
      feeding([bottle("formula", 50, 50, "2026-10-24T21:30:00.000Z")]),
      // 00:10 CEST on 25 Oct (22:10Z on the 24th) belongs to the 25th.
      feeding([bottle("formula", 60, 60, "2026-10-24T22:10:00.000Z")]),
      // 23:30 CET on 25 Oct (22:30Z) still belongs to the 25-hour 25th.
      feeding([bottle("formula", 70, 70, "2026-10-25T22:30:00.000Z")]),
      // 00:05 CET on 26 Oct (23:05Z on the 25th) belongs to the 26th.
      feeding([bottle("formula", 80, 80, "2026-10-25T23:05:00.000Z")]),
    ];
    const days = buildInsights(
      { feedingSessions: sessions, pumpingSessions: [] },
      "2026-10-27",
      7,
      NOW,
    ).feeding.days;
    const formula = Object.fromEntries(days.map((d) => [d.date, d.formulaMl]));
    expect(formula["2026-10-24"]).toBe(50);
    expect(formula["2026-10-25"]).toBe(130);
    expect(formula["2026-10-26"]).toBe(80);
  });

  it("excludes sessions outside the period", () => {
    const sessions = [feeding([bottle("formula", 50, 50, "2026-10-20T21:59:00.000Z")])]; // 23:59 on the 20th
    const insights = buildInsights(
      { feedingSessions: sessions, pumpingSessions: [] },
      "2026-10-27",
      7,
      NOW,
    );
    expect(insights.feeding.totals.sessionCount).toBe(0);
  });
});

describe("buildInsights — feeding", () => {
  const sessions = [
    feeding([
      breast("left", "2026-10-26T06:00:00.000Z", "2026-10-26T06:12:00.000Z", [
        { startedAt: "2026-10-26T06:05:00.000Z", endedAt: "2026-10-26T06:07:00.000Z" },
      ]),
      bottle("formula", 40, 30, "2026-10-26T06:15:00.000Z"),
    ]),
    feeding([bottle("expressed_breast_milk", 90, 80, "2026-10-26T10:00:00.000Z")]),
    feeding([breast("right", "2026-10-26T14:00:00.000Z", "2026-10-26T14:20:00.000Z")]),
  ];
  const insights = buildInsights(
    { feedingSessions: sessions, pumpingSessions: [] },
    "2026-10-27",
    7,
    NOW,
  );
  const day = insights.feeding.days.find((d) => d.date === "2026-10-26")!;

  it("keeps expressed milk and formula separate and breastfeeding as time only", () => {
    expect(day).toEqual({
      date: "2026-10-26",
      sessionCount: 3,
      bottleCount: 2,
      expressedBreastMilkMl: 80,
      formulaMl: 30,
      breastfeedingMs: (10 + 20) * MIN,
    });
    expect(insights.feeding.totals).toMatchObject({
      bottleConsumedMl: 110,
      expressedBreastMilkMl: 80,
      formulaMl: 30,
      breastfeedingMs: 30 * MIN,
      daysWithRecords: 1,
    });
    expect(JSON.stringify(insights.feeding)).not.toMatch(/breastfeedingMl|estimated/);
  });

  it("reports a day with only breastfeeding as 0 ml bottle, not unknown", () => {
    const only = buildInsights(
      { feedingSessions: [sessions[2]!], pumpingSessions: [] },
      "2026-10-27",
      7,
      NOW,
    ).feeding.days.find((d) => d.date === "2026-10-26")!;
    expect(only.formulaMl).toBe(0);
    expect(only.expressedBreastMilkMl).toBe(0);
    expect(only.breastfeedingMs).toBe(20 * MIN);
  });

  it("places feedings on the local 24-hour clock with their type", () => {
    // 06:00Z on 26 Oct is 07:00 CET.
    expect(insights.feeding.rhythm.map((r) => [r.startMinute, r.endMinute, r.kind])).toEqual([
      [7 * 60, 7 * 60 + 15, "mixed"],
      [11 * 60, 11 * 60 + 1, "bottle"],
      [15 * 60, 15 * 60 + 20, "breastfeeding"],
    ]);
  });

  it("caps a feed running past midnight at 24:00 and flags it", () => {
    const late = feeding([breast("left", "2026-10-26T22:50:00.000Z", "2026-10-26T23:20:00.000Z")]); // 23:50–00:20 CET
    const entry = buildInsights(
      { feedingSessions: [late], pumpingSessions: [] },
      "2026-10-27",
      7,
      NOW,
    ).feeding.rhythm[0]!;
    expect(entry).toMatchObject({
      date: "2026-10-26",
      startMinute: 23 * 60 + 50,
      endMinute: 1440,
      continuesNextDay: true,
    });
  });
});

describe("buildInsights — pumping", () => {
  const sessions = [
    pumping("2026-10-26T06:00:00.000Z", 40, 35),
    pumping("2026-10-26T12:00:00.000Z", 0, null),
    pumping("2026-10-25T08:00:00.000Z", null, null),
  ];
  const insights = buildInsights(
    { feedingSessions: [], pumpingSessions: sessions },
    "2026-10-27",
    7,
    NOW,
  );
  const byDate = Object.fromEntries(insights.pumping.days.map((d) => [d.date, d]));

  it("sums measured sides and counts unmeasured sides without treating them as zero", () => {
    expect(byDate["2026-10-26"]).toEqual({
      date: "2026-10-26",
      sessionCount: 2,
      leftMl: 40,
      rightMl: 35,
      measuredMl: 75,
      unmeasuredSides: 1,
      complete: false,
    });
  });

  it("keeps a day where nothing was measured as null, distinct from a measured zero", () => {
    expect(byDate["2026-10-25"]).toMatchObject({
      sessionCount: 1,
      leftMl: null,
      rightMl: null,
      measuredMl: null,
      unmeasuredSides: 2,
    });
    const zero = buildInsights(
      { feedingSessions: [], pumpingSessions: [pumping("2026-10-26T06:00:00.000Z", 0, 0)] },
      "2026-10-27",
      7,
      NOW,
    ).pumping.days.find((d) => d.date === "2026-10-26")!;
    expect(zero).toMatchObject({ leftMl: 0, rightMl: 0, measuredMl: 0, complete: true });
  });

  it("totals only measured volume and reports the unmeasured count", () => {
    expect(insights.pumping.totals).toEqual({
      sessionCount: 3,
      measuredMl: 75,
      leftMl: 40,
      rightMl: 35,
      unmeasuredSides: 3,
      daysWithRecords: 2,
    });
  });
});
