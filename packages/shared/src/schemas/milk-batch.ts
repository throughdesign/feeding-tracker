import { z } from "zod";
import { IdSchema, IsoDateTimeSchema, NotesSchema, VolumeMlSchema } from "./common.js";

export const MilkBatchSourceSchema = z.enum(["pumping", "formula_preparation"]);

/**
 * A quantity of milk that can be tracked over time. Batches are only debited when a
 * bottle segment explicitly references them via `milkBatchId`; nothing is inferred.
 */
export const MilkBatchSchema = z
  .object({
    id: IdSchema,
    source: MilkBatchSourceSchema,
    pumpingSessionId: IdSchema.nullable().optional(),
    createdAt: IsoDateTimeSchema,
    initialVolumeMl: VolumeMlSchema,
    notes: NotesSchema,
  })
  .strict();

export const CreateMilkBatchInputSchema = z
  .object({
    source: MilkBatchSourceSchema,
    pumpingSessionId: IdSchema.nullable().optional(),
    createdAt: IsoDateTimeSchema.optional(),
    initialVolumeMl: VolumeMlSchema,
    notes: NotesSchema,
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.source === "formula_preparation" && value.pumpingSessionId) {
      ctx.addIssue({
        code: "custom",
        path: ["pumpingSessionId"],
        message: "Prepared formula cannot reference a pumping session",
      });
    }
  });
