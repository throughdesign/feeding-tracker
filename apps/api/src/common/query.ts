import { DateKeySchema, FeedingStatusSchema, IdSchema, isValidDateKey } from "@isaac/shared";
import { z } from "zod";

export const CalendarDateSchema = DateKeySchema.refine(isValidDateKey, "Not a valid calendar date");

export const DateFilterQuerySchema = z.object({ date: CalendarDateSchema.optional() });

export const FeedingListQuerySchema = DateFilterQuerySchema.extend({
  status: FeedingStatusSchema.optional(),
});

export const IdParamSchema = IdSchema;
