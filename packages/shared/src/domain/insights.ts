import {
  APP_TIMEZONE,
  addDays,
  dateKeyInZone,
  toZonedInputValue,
  zonedDayBounds,
} from "../time.js";
import type { FeedingSession, PumpingSession } from "../types/index.js";
import { summarizeFeeding } from "./feeding.js";

export const INSIGHT_PERIODS = [7, 14] as const;
export type InsightPeriod = (typeof INSIGHT_PERIODS)[number];

/**
 * One calendar day of feeding. Values are `null` on days without any recorded
 * feeding, so "nothing recorded" is never shown as a measured 0.
 */
export type FeedingInsightDay = {
  date: string;
  sessionCount: number;
  bottleCount: number;
  /** Measured bottle consumption of expressed breast milk. */
  expressedBreastMilkMl: number | null;
  /** Measured bottle consumption of formula. */
  formulaMl: number | null;
  /** Direct breastfeeding time. Volume is unknown and never estimated. */
  breastfeedingMs: number | null;
};

/** A feeding placed on the 24-hour clock of the day it started (Amsterdam wall time). */
export type FeedingRhythmEntry = {
  id: string;
  date: string;
  /** Minutes since local midnight, 0–1439. */
  startMinute: number;
  /** Minutes since local midnight, capped at 1440 for feeds that run past midnight. */
  endMinute: number;
  continuesNextDay: boolean;
  kind: "breastfeeding" | "bottle" | "mixed";
  active: boolean;
};

/**
 * One calendar day of pumping. A side's value is the sum of its *measured*
 * volumes and is `null` when that side was never measured that day (or nothing
 * was recorded). `unmeasuredSides` counts sides recorded as unknown.
 */
export type PumpingInsightDay = {
  date: string;
  sessionCount: number;
  leftMl: number | null;
  rightMl: number | null;
  /** Sum of all measured volumes; `null` if nothing was measured that day. */
  measuredMl: number | null;
  unmeasuredSides: number;
  /** True when every recorded side that day was measured. */
  complete: boolean;
};

export type Insights = {
  timezone: string;
  generatedAt: string;
  period: { days: InsightPeriod; startDate: string; endDate: string };
  feeding: {
    days: FeedingInsightDay[];
    rhythm: FeedingRhythmEntry[];
    totals: {
      sessionCount: number;
      bottleCount: number;
      bottleConsumedMl: number;
      expressedBreastMilkMl: number;
      formulaMl: number;
      breastfeedingMs: number;
      daysWithRecords: number;
    };
  };
  pumping: {
    days: PumpingInsightDay[];
    totals: {
      sessionCount: number;
      measuredMl: number;
      leftMl: number;
      rightMl: number;
      unmeasuredSides: number;
      daysWithRecords: number;
    };
  };
};

function wallMinute(iso: string): number {
  const [, time] = toZonedInputValue(iso).split("T") as [string, string];
  const [h, m] = time.split(":").map(Number) as [number, number];
  return h * 60 + m;
}

function groupByStartDay<T extends { startedAt: string }>(items: T[], dates: Set<string>) {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const date = dateKeyInZone(item.startedAt);
    if (!dates.has(date)) continue;
    groups.set(date, [...(groups.get(date) ?? []), item]);
  }
  return groups;
}

/**
 * Aggregates the `days` calendar days (Europe/Amsterdam) ending on `endDate`.
 * Like the dashboard, an activity belongs to the day on which it started.
 */
export function buildInsights(
  data: { feedingSessions: FeedingSession[]; pumpingSessions: PumpingSession[] },
  endDate: string,
  days: InsightPeriod,
  now: number = Date.now(),
): Insights {
  zonedDayBounds(endDate); // validates the date key
  const dates = Array.from({ length: days }, (_, i) => addDays(endDate, i - (days - 1)));
  const dateSet = new Set(dates);
  const feedingsByDay = groupByStartDay(data.feedingSessions, dateSet);
  const pumpingByDay = groupByStartDay(data.pumpingSessions, dateSet);

  const rhythm: FeedingRhythmEntry[] = [];
  const feedingDays = dates.map((date): FeedingInsightDay => {
    const sessions = feedingsByDay.get(date) ?? [];
    if (sessions.length === 0) {
      return {
        date,
        sessionCount: 0,
        bottleCount: 0,
        expressedBreastMilkMl: null,
        formulaMl: null,
        breastfeedingMs: null,
      };
    }
    const day = { expressed: 0, formula: 0, breastMs: 0, bottles: 0 };
    for (const session of sessions) {
      const summary = summarizeFeeding(session, now);
      day.expressed += summary.bottle.expressedBreastMilkMl;
      day.formula += summary.bottle.formulaMl;
      day.bottles += summary.bottle.count;
      day.breastMs += summary.breastfeeding.totalMs;

      const startMinute = wallMinute(session.startedAt);
      const endIso =
        session.endedAt ?? new Date(Math.max(now, Date.parse(session.startedAt))).toISOString();
      const durationMin = Math.max(
        1,
        Math.round((Date.parse(endIso) - Date.parse(session.startedAt)) / 60_000),
      );
      rhythm.push({
        id: session.id,
        date,
        startMinute,
        endMinute: Math.min(1440, startMinute + durationMin),
        continuesNextDay: startMinute + durationMin > 1440,
        kind:
          summary.hasBreastfeeding && summary.hasBottle
            ? "mixed"
            : summary.hasBreastfeeding
              ? "breastfeeding"
              : "bottle",
        active: session.status === "active",
      });
    }
    return {
      date,
      sessionCount: sessions.length,
      bottleCount: day.bottles,
      expressedBreastMilkMl: day.expressed,
      formulaMl: day.formula,
      breastfeedingMs: day.breastMs,
    };
  });

  const pumpingDays = dates.map((date): PumpingInsightDay => {
    const sessions = pumpingByDay.get(date) ?? [];
    let left: number | null = null;
    let right: number | null = null;
    let unmeasuredSides = 0;
    for (const s of sessions) {
      if (s.leftVolumeMl === null) unmeasuredSides += 1;
      else left = (left ?? 0) + s.leftVolumeMl;
      if (s.rightVolumeMl === null) unmeasuredSides += 1;
      else right = (right ?? 0) + s.rightVolumeMl;
    }
    const measuredMl = left === null && right === null ? null : (left ?? 0) + (right ?? 0);
    return {
      date,
      sessionCount: sessions.length,
      leftMl: left,
      rightMl: right,
      measuredMl,
      unmeasuredSides,
      complete: sessions.length > 0 && unmeasuredSides === 0,
    };
  });

  const sum = (values: (number | null)[]) => values.reduce<number>((a, v) => a + (v ?? 0), 0);

  return {
    timezone: APP_TIMEZONE,
    generatedAt: new Date(now).toISOString(),
    period: { days, startDate: dates[0]!, endDate },
    feeding: {
      days: feedingDays,
      rhythm: rhythm.sort((a, b) => a.date.localeCompare(b.date) || a.startMinute - b.startMinute),
      totals: {
        sessionCount: sum(feedingDays.map((d) => d.sessionCount)),
        bottleCount: sum(feedingDays.map((d) => d.bottleCount)),
        bottleConsumedMl:
          sum(feedingDays.map((d) => d.expressedBreastMilkMl)) +
          sum(feedingDays.map((d) => d.formulaMl)),
        expressedBreastMilkMl: sum(feedingDays.map((d) => d.expressedBreastMilkMl)),
        formulaMl: sum(feedingDays.map((d) => d.formulaMl)),
        breastfeedingMs: sum(feedingDays.map((d) => d.breastfeedingMs)),
        daysWithRecords: feedingDays.filter((d) => d.sessionCount > 0).length,
      },
    },
    pumping: {
      days: pumpingDays,
      totals: {
        sessionCount: sum(pumpingDays.map((d) => d.sessionCount)),
        measuredMl: sum(pumpingDays.map((d) => d.measuredMl)),
        leftMl: sum(pumpingDays.map((d) => d.leftMl)),
        rightMl: sum(pumpingDays.map((d) => d.rightMl)),
        unmeasuredSides: sum(pumpingDays.map((d) => d.unmeasuredSides)),
        daysWithRecords: pumpingDays.filter((d) => d.sessionCount > 0).length,
      },
    },
  };
}
