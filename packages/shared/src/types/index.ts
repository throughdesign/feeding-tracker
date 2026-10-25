import type { z } from "zod";
import type { DatabaseSchema } from "../schemas/database.js";
import type {
  BottleFeedingSegmentSchema,
  BottleMilkTypeSchema,
  BreastSideSchema,
  BreastfeedingSegmentSchema,
  CreateFeedingSessionInputSchema,
  FeedingSegmentInputSchema,
  FeedingSegmentSchema,
  FeedingSessionSchema,
  PauseSchema,
  UpdateFeedingSessionInputSchema,
} from "../schemas/feeding.js";
import type { CreateMilkBatchInputSchema, MilkBatchSchema } from "../schemas/milk-batch.js";
import type { PersonSchema } from "../schemas/person.js";
import type {
  CreatePumpingSessionInputSchema,
  PumpingSessionSchema,
  UpdatePumpingSessionInputSchema,
} from "../schemas/pumping.js";

export type Person = z.infer<typeof PersonSchema>;
export type PumpingSession = z.infer<typeof PumpingSessionSchema>;
export type BreastSide = z.infer<typeof BreastSideSchema>;
export type BottleMilkType = z.infer<typeof BottleMilkTypeSchema>;
export type Pause = z.infer<typeof PauseSchema>;
export type BreastfeedingSegment = z.infer<typeof BreastfeedingSegmentSchema>;
export type BottleFeedingSegment = z.infer<typeof BottleFeedingSegmentSchema>;
export type FeedingSegment = z.infer<typeof FeedingSegmentSchema>;
export type FeedingSession = z.infer<typeof FeedingSessionSchema>;
export type MilkBatch = z.infer<typeof MilkBatchSchema>;
export type Database = z.infer<typeof DatabaseSchema>;

export type CreatePumpingSessionInput = z.input<typeof CreatePumpingSessionInputSchema>;
export type UpdatePumpingSessionInput = z.input<typeof UpdatePumpingSessionInputSchema>;
export type FeedingSegmentInput = z.input<typeof FeedingSegmentInputSchema>;
export type CreateFeedingSessionInput = z.input<typeof CreateFeedingSessionInputSchema>;
export type UpdateFeedingSessionInput = z.input<typeof UpdateFeedingSessionInputSchema>;
export type CreateMilkBatchInput = z.input<typeof CreateMilkBatchInputSchema>;

/** Derived total of a pumping session. A partial subtotal is never a confirmed total. */
export type PumpingTotal =
  | { kind: "complete"; totalMl: number; knownMl: number }
  | { kind: "partial"; totalMl: null; knownMl: number; unknownSide: BreastSide }
  | { kind: "unknown"; totalMl: null; knownMl: null };

export type FeedingSummary = {
  breastfeeding: { leftMs: number; rightMs: number; totalMs: number };
  bottle: {
    count: number;
    offeredMl: number;
    consumedMl: number;
    expressedBreastMilkMl: number;
    formulaMl: number;
  };
  hasBreastfeeding: boolean;
  hasBottle: boolean;
};

export type FeedingWithSummary = FeedingSession & { summary: FeedingSummary };
export type PumpingWithTotal = PumpingSession & { total: PumpingTotal };

export type TimelineItem =
  | { kind: "feeding"; id: string; startedAt: string; feeding: FeedingWithSummary }
  | { kind: "pumping"; id: string; startedAt: string; pumping: PumpingWithTotal };

export type Dashboard = {
  date: string;
  timezone: string;
  generatedAt: string;
  feeding: {
    sessionCount: number;
    /** Measured bottle consumption only. Direct breastfeeding volume is unknown. */
    bottle: FeedingSummary["bottle"];
    /** Direct breastfeeding is reported as time only; volume is never estimated. */
    breastfeeding: FeedingSummary["breastfeeding"] & { sessionCount: number };
  };
  pumping: {
    sessionCount: number;
    /** Sum of every measured breast volume. */
    knownVolumeMl: number;
    leftMl: number;
    rightMl: number;
    /** Sessions where at least one breast volume was not recorded. */
    sessionsWithUnknownVolume: number;
  };
  activeFeeding: FeedingWithSummary | null;
  mostRecentFeeding: FeedingWithSummary | null;
  /** Activities that started on `date`, oldest first. */
  timeline: TimelineItem[];
};

export type MilkBatchWithUsage = MilkBatch & {
  /** Sum of consumed volumes from bottle segments that explicitly reference this batch. */
  consumedMl: number;
  offeredMl: number;
};

export type ApiErrorBody = {
  error: {
    code: string;
    message: string;
    issues?: Array<{ path: string; message: string }>;
  };
};
