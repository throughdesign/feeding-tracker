import { z } from "zod";
import {
  IdSchema,
  IsoDateTimeSchema,
  NotesSchema,
  PersonIdSchema,
  VolumeMlSchema,
  isBefore,
} from "./common.js";
import { DEFAULT_MOTHER_ID } from "./person.js";

const pumpingFields = {
  motherId: PersonIdSchema,
  startedAt: IsoDateTimeSchema,
  endedAt: IsoDateTimeSchema.nullable(),
  /** `null` means the volume was not measured; `0` means nothing was expressed. */
  leftVolumeMl: VolumeMlSchema.nullable(),
  rightVolumeMl: VolumeMlSchema.nullable(),
  notes: NotesSchema,
};

function checkPumpingTimes(
  value: { startedAt?: string; endedAt?: string | null },
  ctx: z.RefinementCtx,
): void {
  if (value.startedAt && value.endedAt && isBefore(value.endedAt, value.startedAt)) {
    ctx.addIssue({
      code: "custom",
      path: ["endedAt"],
      message: "End time cannot be before start time",
    });
  }
}

export const PumpingSessionSchema = z
  .object({
    id: IdSchema,
    ...pumpingFields,
    createdAt: IsoDateTimeSchema,
    updatedAt: IsoDateTimeSchema,
  })
  .superRefine(checkPumpingTimes);

export const CreatePumpingSessionInputSchema = z
  .object({
    ...pumpingFields,
    motherId: PersonIdSchema.default(DEFAULT_MOTHER_ID),
    endedAt: IsoDateTimeSchema.nullable().default(null),
    leftVolumeMl: VolumeMlSchema.nullable().default(null),
    rightVolumeMl: VolumeMlSchema.nullable().default(null),
  })
  .strict()
  .superRefine(checkPumpingTimes);

/** Partial update. The merged session is re-validated with `PumpingSessionSchema`. */
export const UpdatePumpingSessionInputSchema = z
  .object(pumpingFields)
  .omit({ motherId: true })
  .partial()
  .strict();
