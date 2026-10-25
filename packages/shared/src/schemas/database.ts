import { z } from "zod";
import { FeedingSessionSchema } from "./feeding.js";
import { MilkBatchSchema } from "./milk-batch.js";
import { PersonSchema } from "./person.js";
import { PumpingSessionSchema } from "./pumping.js";

export const CURRENT_SCHEMA_VERSION = 1;

/** Shape of `data/feeding.json`. Validated on every read and before every write. */
export const DatabaseSchema = z
  .object({
    schemaVersion: z.literal(CURRENT_SCHEMA_VERSION),
    people: z.array(PersonSchema),
    feedingSessions: z.array(FeedingSessionSchema),
    pumpingSessions: z.array(PumpingSessionSchema),
    milkBatches: z.array(MilkBatchSchema),
  })
  .strict()
  .superRefine((db, ctx) => {
    const seen = new Set<string>();
    const collections = ["people", "feedingSessions", "pumpingSessions", "milkBatches"] as const;
    for (const key of collections) {
      db[key].forEach((item, i) => {
        if (seen.has(item.id)) {
          ctx.addIssue({
            code: "custom",
            path: [key, i, "id"],
            message: `Duplicate id ${item.id}`,
          });
        }
        seen.add(item.id);
      });
    }
  });
