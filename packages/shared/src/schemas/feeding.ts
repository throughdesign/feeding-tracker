import { z } from "zod";
import {
  IdSchema,
  IsoDateTimeSchema,
  NotesSchema,
  PersonIdSchema,
  VolumeMlSchema,
  isBefore,
} from "./common.js";
import { DEFAULT_BABY_ID } from "./person.js";

export const BreastSideSchema = z.enum(["left", "right"]);
export const BottleMilkTypeSchema = z.enum(["expressed_breast_milk", "formula"]);
export const FeedingStatusSchema = z.enum(["active", "completed"]);

export const PauseSchema = z.object({
  startedAt: IsoDateTimeSchema,
  endedAt: IsoDateTimeSchema.nullable(),
});

const breastfeedingFields = {
  type: z.literal("breastfeeding"),
  breast: BreastSideSchema,
  startedAt: IsoDateTimeSchema,
  endedAt: IsoDateTimeSchema.nullable(),
  pauses: z.array(PauseSchema),
};

// Breastfeeding segments intentionally have no volume field: direct
// breastfeeding volume is unknown and must never be estimated.
const bottleFields = {
  type: z.literal("bottle"),
  milkType: BottleMilkTypeSchema,
  offeredMl: VolumeMlSchema,
  consumedMl: VolumeMlSchema,
  startedAt: IsoDateTimeSchema,
  endedAt: IsoDateTimeSchema.nullable(),
  milkBatchId: IdSchema.nullable().optional(),
};

export const BreastfeedingSegmentSchema = z
  .object({ id: IdSchema, ...breastfeedingFields })
  .strict();
export const BottleFeedingSegmentSchema = z.object({ id: IdSchema, ...bottleFields }).strict();

export const FeedingSegmentSchema = z.discriminatedUnion("type", [
  BreastfeedingSegmentSchema,
  BottleFeedingSegmentSchema,
]);

/** Segments in requests may omit `id`; the server assigns one. */
export const FeedingSegmentInputSchema = z.discriminatedUnion("type", [
  z.object({ id: IdSchema.optional(), ...breastfeedingFields }).strict(),
  z.object({ id: IdSchema.optional(), ...bottleFields }).strict(),
]);

type SessionLike = {
  status: "active" | "completed";
  startedAt: string;
  endedAt: string | null;
  segments: Array<z.infer<typeof FeedingSegmentInputSchema>>;
};

/**
 * Invariants of a feeding session. Shared by the persisted entity schema and by
 * the server after it merges a partial update.
 */
export function checkFeedingSession(session: SessionLike, ctx: z.RefinementCtx): void {
  const issue = (path: (string | number)[], message: string) =>
    ctx.addIssue({ code: "custom", path, message });

  if (session.segments.length === 0) {
    issue(["segments"], "A feeding needs at least one breast or bottle segment");
  }
  if (session.endedAt && isBefore(session.endedAt, session.startedAt)) {
    issue(["endedAt"], "End time cannot be before start time");
  }
  if (session.status === "active" && session.endedAt !== null) {
    issue(["endedAt"], "An active feeding cannot have an end time");
  }
  if (session.status === "completed" && session.endedAt === null) {
    issue(["endedAt"], "A completed feeding needs an end time");
  }

  let openBreastSegments = 0;
  session.segments.forEach((segment, i) => {
    const path = ["segments", i];
    if (segment.endedAt && isBefore(segment.endedAt, segment.startedAt)) {
      issue([...path, "endedAt"], "Segment end cannot be before its start");
    }
    if (segment.endedAt === null && session.status === "completed") {
      issue([...path, "endedAt"], "Every segment of a completed feeding needs an end time");
    }

    if (segment.type === "bottle") {
      if (segment.consumedMl > segment.offeredMl) {
        issue([...path, "consumedMl"], "Consumed volume cannot exceed the offered volume");
      }
      return;
    }

    if (segment.endedAt === null) openBreastSegments += 1;
    segment.pauses.forEach((pause, j) => {
      const pausePath = [...path, "pauses", j];
      const isLast = j === segment.pauses.length - 1;
      if (pause.endedAt && isBefore(pause.endedAt, pause.startedAt)) {
        issue([...pausePath, "endedAt"], "Pause end cannot be before its start");
      }
      if (isBefore(pause.startedAt, segment.startedAt)) {
        issue([...pausePath, "startedAt"], "Pause cannot start before the segment");
      }
      if (segment.endedAt) {
        if (pause.endedAt === null) {
          issue([...pausePath, "endedAt"], "A finished segment cannot have an open pause");
        } else if (isBefore(segment.endedAt, pause.endedAt)) {
          issue([...pausePath, "endedAt"], "Pause cannot end after the segment");
        }
      }
      if (pause.endedAt === null && !isLast) {
        issue([...pausePath, "endedAt"], "Only the most recent pause can be open");
      }
      const next = segment.pauses[j + 1];
      if (next && (pause.endedAt === null || isBefore(next.startedAt, pause.endedAt))) {
        issue([...path, "pauses", j + 1, "startedAt"], "Pauses cannot overlap");
      }
    });
  });

  if (openBreastSegments > 1) {
    issue(["segments"], "Only one breast can be timed at a time");
  }
}

const feedingFields = {
  babyId: PersonIdSchema,
  startedAt: IsoDateTimeSchema,
  endedAt: IsoDateTimeSchema.nullable(),
  status: FeedingStatusSchema,
  notes: NotesSchema,
};

export const FeedingSessionSchema = z
  .object({
    id: IdSchema,
    ...feedingFields,
    segments: z.array(FeedingSegmentSchema),
    createdAt: IsoDateTimeSchema,
    updatedAt: IsoDateTimeSchema,
  })
  .strict()
  .superRefine(checkFeedingSession);

export const CreateFeedingSessionInputSchema = z
  .object({
    ...feedingFields,
    babyId: PersonIdSchema.default(DEFAULT_BABY_ID),
    // Session bounds are derived from segments when omitted.
    startedAt: IsoDateTimeSchema.optional(),
    endedAt: IsoDateTimeSchema.nullable().optional(),
    segments: z.array(FeedingSegmentInputSchema).min(1),
  })
  .strict();

/** Partial update; `segments`, when present, replaces the whole list. */
export const UpdateFeedingSessionInputSchema = z
  .object({
    status: FeedingStatusSchema,
    startedAt: IsoDateTimeSchema,
    endedAt: IsoDateTimeSchema.nullable(),
    segments: z.array(FeedingSegmentInputSchema).min(1),
    notes: NotesSchema,
  })
  .partial()
  .strict();
