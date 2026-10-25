import { describe, expect, it } from "vitest";
import {
  addDays,
  dateKeyInZone,
  fromZonedInputValue,
  isValidDateKey,
  toZonedInputValue,
  zonedDayBounds,
} from "../time.js";

describe("Europe/Amsterdam calendar days", () => {
  it("maps UTC instants to the Amsterdam calendar date", () => {
    // 23:30 UTC on 24 Oct is 01:30 CEST on 25 Oct.
    expect(dateKeyInZone("2026-10-24T23:30:00.000Z")).toBe("2026-10-25");
    expect(dateKeyInZone("2026-10-24T21:59:00.000Z")).toBe("2026-10-24");
  });

  it("computes day bounds across the end of DST (25-hour day)", () => {
    // DST ends on 25 Oct 2026: 03:00 CEST -> 02:00 CET.
    const { start, end } = zonedDayBounds("2026-10-25");
    expect(start).toBe("2026-10-24T22:00:00.000Z");
    expect(end).toBe("2026-10-25T23:00:00.000Z");
  });

  it("computes day bounds in winter time", () => {
    expect(zonedDayBounds("2026-12-01")).toEqual({
      start: "2026-11-30T23:00:00.000Z",
      end: "2026-12-01T23:00:00.000Z",
    });
  });

  it("round-trips datetime-local values in Amsterdam time", () => {
    const iso = fromZonedInputValue("2026-07-01T14:05");
    expect(iso).toBe("2026-07-01T12:05:00.000Z");
    expect(toZonedInputValue(iso!)).toBe("2026-07-01T14:05");
    expect(fromZonedInputValue("not a date")).toBeNull();
  });

  it("validates and shifts date keys", () => {
    expect(isValidDateKey("2026-02-29")).toBe(false);
    expect(isValidDateKey("2028-02-29")).toBe(true);
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });
});
