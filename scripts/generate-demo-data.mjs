// Generates 14 days of fictional demo data (never real family data) into
// data/demo/feeding.json, validated against the shared schema. Overwrites only
// that demo file. Requires the shared package to be built.
import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  DatabaseSchema,
  addDays,
  dateKeyInZone,
  fromZonedInputValue,
} from "../packages/shared/dist/index.js";

const target = fileURLToPath(new URL("../data/demo/feeding.json", import.meta.url));
const now = Date.now();
const today = dateKeyInZone(now);

let seed = 20261025;
const random = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
const at = (date, hhmm) => fromZonedInputValue(`${date}T${hhmm}`);
const plus = (iso, minutes) => new Date(Date.parse(iso) + minutes * 60_000).toISOString();
const id = () => randomUUID();

const feedingSessions = [];
const pumpingSessions = [];
const feedTimes = ["00:40", "03:45", "06:50", "09:55", "13:00", "16:10", "19:20", "22:30"];
const pumpTimes = ["05:30", "12:15", "18:45"];

for (let offset = 13; offset >= 0; offset--) {
  if (offset === 9) continue; // one day without any records
  const date = addDays(today, -offset);

  for (const time of feedTimes) {
    if (random() < 0.12) continue;
    const start = at(date, time);
    if (Date.parse(start) > now - 30 * 60_000) continue; // nothing in the future
    const kind = random();
    const segments = [];
    if (kind < 0.55) {
      const left = 7 + Math.round(random() * 10);
      const right = 5 + Math.round(random() * 10);
      const pauses = random() < 0.3 ? [{ startedAt: plus(start, 3), endedAt: plus(start, 5) }] : [];
      segments.push({
        id: id(),
        type: "breastfeeding",
        breast: "left",
        startedAt: start,
        endedAt: plus(start, left + (pauses.length ? 2 : 0)),
        pauses,
      });
      const rStart = plus(start, left + (pauses.length ? 2 : 0));
      segments.push({
        id: id(),
        type: "breastfeeding",
        breast: "right",
        startedAt: rStart,
        endedAt: plus(rStart, right),
        pauses: [],
      });
      if (kind < 0.2) {
        const bStart = plus(rStart, right + 2);
        segments.push({
          id: id(),
          type: "bottle",
          milkType: "formula",
          offeredMl: 40,
          consumedMl: 20 + Math.round(random() * 20),
          startedAt: bStart,
          endedAt: plus(bStart, 6),
          milkBatchId: null,
        });
      }
    } else {
      const offered = 60 + Math.round(random() * 4) * 10;
      const milkType = kind < 0.85 ? "expressed_breast_milk" : "formula";
      segments.push({
        id: id(),
        type: "bottle",
        milkType,
        offeredMl: offered,
        consumedMl: offered - Math.round(random() * 20),
        startedAt: start,
        endedAt: plus(start, 15),
        milkBatchId: null,
      });
    }
    const end = segments.at(-1).endedAt;
    feedingSessions.push({
      id: id(),
      babyId: "isaac",
      startedAt: start,
      endedAt: end,
      status: "completed",
      segments,
      notes: "Demo data",
      createdAt: end,
      updatedAt: end,
    });
  }

  for (const time of pumpTimes) {
    if (random() < 0.15) continue;
    const start = at(date, time);
    if (Date.parse(start) > now - 30 * 60_000) continue;
    const u = random();
    pumpingSessions.push({
      id: id(),
      motherId: "mother",
      startedAt: start,
      endedAt: plus(start, 20),
      leftVolumeMl: u < 0.06 ? null : 30 + Math.round(random() * 40),
      rightVolumeMl: u < 0.14 ? null : u < 0.2 ? 0 : 25 + Math.round(random() * 40),
      notes: "Demo data",
      createdAt: plus(start, 20),
      updatedAt: plus(start, 20),
    });
  }
}

const createdAt = at(addDays(today, -14), "09:00");
const db = {
  schemaVersion: 1,
  people: [
    { id: "mother", name: "Mother", role: "mother", createdAt },
    { id: "isaac", name: "Isaac", role: "baby", createdAt },
  ],
  feedingSessions,
  pumpingSessions,
  milkBatches: [],
};

const parsed = DatabaseSchema.safeParse(db);
if (!parsed.success) {
  console.error("Generated demo data is invalid:", parsed.error.issues.slice(0, 3));
  process.exit(1);
}
mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, `${JSON.stringify(db, null, 2)}\n`);
const unmeasured = pumpingSessions.filter(
  (p) => p.leftVolumeMl === null || p.rightVolumeMl === null,
).length;
console.log(
  `Demo data: ${feedingSessions.length} feedings, ${pumpingSessions.length} pumping sessions (${unmeasured} with an unmeasured side) → data/demo/feeding.json`,
);
