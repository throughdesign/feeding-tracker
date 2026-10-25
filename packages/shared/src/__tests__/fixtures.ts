import { randomUUID } from "node:crypto";
import type {
  BottleFeedingSegment,
  BreastfeedingSegment,
  FeedingSegment,
  FeedingSession,
  PumpingSession,
} from "../types/index.js";

export function feeding(
  segments: FeedingSegment[],
  overrides: Partial<FeedingSession> = {},
): FeedingSession {
  const starts = segments.map((s) => s.startedAt).sort();
  const ends = segments.map((s) => s.endedAt ?? "").sort();
  return {
    id: randomUUID(),
    babyId: "isaac",
    startedAt: starts[0] ?? "2026-10-25T10:00:00.000Z",
    endedAt: ends.at(-1) || null,
    status: "completed",
    segments,
    createdAt: "2026-10-25T10:00:00.000Z",
    updatedAt: "2026-10-25T10:00:00.000Z",
    ...overrides,
  };
}

export function breast(
  side: "left" | "right",
  startedAt: string,
  endedAt: string | null,
  pauses: Array<{ startedAt: string; endedAt: string | null }> = [],
): BreastfeedingSegment {
  return { id: randomUUID(), type: "breastfeeding", breast: side, startedAt, endedAt, pauses };
}

export function bottle(
  milkType: "expressed_breast_milk" | "formula",
  offeredMl: number,
  consumedMl: number,
  at: string,
): BottleFeedingSegment {
  return {
    id: randomUUID(),
    type: "bottle",
    milkType,
    offeredMl,
    consumedMl,
    startedAt: at,
    endedAt: at,
  };
}

export function pumping(
  startedAt: string,
  leftVolumeMl: number | null,
  rightVolumeMl: number | null,
): PumpingSession {
  return {
    id: randomUUID(),
    motherId: "mother",
    startedAt,
    endedAt: startedAt,
    leftVolumeMl,
    rightVolumeMl,
    createdAt: startedAt,
    updatedAt: startedAt,
  };
}
