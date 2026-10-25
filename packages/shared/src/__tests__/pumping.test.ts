import { describe, expect, it } from "vitest";
import { pumpingTotal } from "../domain/pumping.js";
import { CreatePumpingSessionInputSchema } from "../schemas/pumping.js";

describe("pumpingTotal", () => {
  it("adds both breasts when both are measured", () => {
    expect(pumpingTotal({ leftVolumeMl: 40, rightVolumeMl: 35 })).toEqual({
      kind: "complete",
      totalMl: 75,
      knownMl: 75,
    });
  });

  it("treats zero as a real measurement", () => {
    expect(pumpingTotal({ leftVolumeMl: 0, rightVolumeMl: 0 })).toEqual({
      kind: "complete",
      totalMl: 0,
      knownMl: 0,
    });
    expect(pumpingTotal({ leftVolumeMl: 0, rightVolumeMl: 20 }).totalMl).toBe(20);
  });

  it("never reports a confirmed total when one side is unknown", () => {
    const total = pumpingTotal({ leftVolumeMl: 50, rightVolumeMl: null });
    expect(total).toEqual({ kind: "partial", totalMl: null, knownMl: 50, unknownSide: "right" });
  });

  it("reports unknown when neither side was measured", () => {
    expect(pumpingTotal({ leftVolumeMl: null, rightVolumeMl: null })).toEqual({
      kind: "unknown",
      totalMl: null,
      knownMl: null,
    });
  });
});

describe("CreatePumpingSessionInputSchema", () => {
  const base = { startedAt: "2026-10-25T08:00:00.000Z", endedAt: "2026-10-25T08:20:00.000Z" };

  it("defaults volumes to unknown rather than zero", () => {
    const parsed = CreatePumpingSessionInputSchema.parse(base);
    expect(parsed.leftVolumeMl).toBeNull();
    expect(parsed.rightVolumeMl).toBeNull();
    expect(parsed.motherId).toBe("mother");
  });

  it("rejects negative volumes and an end before the start", () => {
    expect(CreatePumpingSessionInputSchema.safeParse({ ...base, leftVolumeMl: -1 }).success).toBe(
      false,
    );
    expect(
      CreatePumpingSessionInputSchema.safeParse({ ...base, endedAt: "2026-10-25T07:00:00.000Z" })
        .success,
    ).toBe(false);
  });

  it("rejects a client-provided total", () => {
    expect(CreatePumpingSessionInputSchema.safeParse({ ...base, totalMl: 80 }).success).toBe(false);
  });
});
