import { APP_TIMEZONE, zonedDayBounds } from "../time.js";
import type {
  Dashboard,
  FeedingSession,
  FeedingWithSummary,
  PumpingSession,
  TimelineItem,
} from "../types/index.js";
import { summarizeFeeding } from "./feeding.js";
import { pumpingTotal } from "./pumping.js";

function withSummary(session: FeedingSession, now: number): FeedingWithSummary {
  return { ...session, summary: summarizeFeeding(session, now) };
}

function startsWithin(startedAt: string, bounds: { start: string; end: string }): boolean {
  const t = Date.parse(startedAt);
  return t >= Date.parse(bounds.start) && t < Date.parse(bounds.end);
}

const byStart = (a: { startedAt: string }, b: { startedAt: string }) =>
  Date.parse(a.startedAt) - Date.parse(b.startedAt);

/**
 * Daily aggregation for a calendar day in Europe/Amsterdam. Activities belong to
 * the day on which they started, so a feed starting at 23:50 counts entirely
 * towards that day even if it ends after midnight.
 *
 * Measured bottle volumes and direct breastfeeding (time only) are reported
 * separately and never combined into one intake figure.
 */
export function buildDashboard(
  data: { feedingSessions: FeedingSession[]; pumpingSessions: PumpingSession[] },
  date: string,
  now: number = Date.now(),
): Dashboard {
  const bounds = zonedDayBounds(date);
  const feedings = data.feedingSessions
    .filter((s) => startsWithin(s.startedAt, bounds))
    .sort(byStart)
    .map((s) => withSummary(s, now));
  const pumpings = data.pumpingSessions
    .filter((s) => startsWithin(s.startedAt, bounds))
    .sort(byStart)
    .map((s) => ({ ...s, total: pumpingTotal(s) }));

  const dashboard: Dashboard = {
    date,
    timezone: APP_TIMEZONE,
    generatedAt: new Date(now).toISOString(),
    feeding: {
      sessionCount: feedings.length,
      bottle: { count: 0, offeredMl: 0, consumedMl: 0, expressedBreastMilkMl: 0, formulaMl: 0 },
      breastfeeding: { leftMs: 0, rightMs: 0, totalMs: 0, sessionCount: 0 },
    },
    pumping: {
      sessionCount: pumpings.length,
      knownVolumeMl: 0,
      leftMl: 0,
      rightMl: 0,
      sessionsWithUnknownVolume: 0,
    },
    activeFeeding: null,
    mostRecentFeeding: null,
    timeline: [],
  };

  for (const { summary } of feedings) {
    const bottle = dashboard.feeding.bottle;
    bottle.count += summary.bottle.count;
    bottle.offeredMl += summary.bottle.offeredMl;
    bottle.consumedMl += summary.bottle.consumedMl;
    bottle.expressedBreastMilkMl += summary.bottle.expressedBreastMilkMl;
    bottle.formulaMl += summary.bottle.formulaMl;

    const breast = dashboard.feeding.breastfeeding;
    breast.leftMs += summary.breastfeeding.leftMs;
    breast.rightMs += summary.breastfeeding.rightMs;
    breast.totalMs += summary.breastfeeding.totalMs;
    if (summary.hasBreastfeeding) breast.sessionCount += 1;
  }

  for (const session of pumpings) {
    const p = dashboard.pumping;
    p.knownVolumeMl += session.total.knownMl ?? 0;
    p.leftMl += session.leftVolumeMl ?? 0;
    p.rightMl += session.rightVolumeMl ?? 0;
    if (session.total.kind !== "complete") p.sessionsWithUnknownVolume += 1;
  }

  const active = data.feedingSessions.find((s) => s.status === "active");
  dashboard.activeFeeding = active ? withSummary(active, now) : null;

  const latest = data.feedingSessions
    .filter((s) => Date.parse(s.startedAt) <= now)
    .sort(byStart)
    .at(-1);
  dashboard.mostRecentFeeding = latest ? withSummary(latest, now) : null;

  const timeline: TimelineItem[] = [
    ...feedings.map((feeding): TimelineItem => ({
      kind: "feeding",
      id: feeding.id,
      startedAt: feeding.startedAt,
      feeding,
    })),
    ...pumpings.map((pumping): TimelineItem => ({
      kind: "pumping",
      id: pumping.id,
      startedAt: pumping.startedAt,
      pumping,
    })),
  ];
  dashboard.timeline = timeline.sort(byStart);

  return dashboard;
}
