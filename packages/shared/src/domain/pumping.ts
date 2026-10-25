import type { PumpingSession, PumpingTotal } from "../types/index.js";

export function pumpingTotal(
  session: Pick<PumpingSession, "leftVolumeMl" | "rightVolumeMl">,
): PumpingTotal {
  const { leftVolumeMl: left, rightVolumeMl: right } = session;
  if (left === null && right === null) {
    return { kind: "unknown", totalMl: null, knownMl: null };
  }
  if (left === null) {
    return { kind: "partial", totalMl: null, knownMl: right as number, unknownSide: "left" };
  }
  if (right === null) {
    return { kind: "partial", totalMl: null, knownMl: left, unknownSide: "right" };
  }
  return { kind: "complete", totalMl: left + right, knownMl: left + right };
}
