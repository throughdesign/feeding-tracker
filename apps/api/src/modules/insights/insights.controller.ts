import { Controller, Get, Inject, Query } from "@nestjs/common";
import { z } from "zod";
import { CalendarDateSchema } from "../../common/query.js";
import { ZodValidationPipe } from "../../common/zod-validation.pipe.js";
import { InsightsService } from "./insights.service.js";

const InsightsQuerySchema = z
  .object({
    days: z
      .enum(["7", "14"])
      .default("7")
      .transform((v) => Number(v) as 7 | 14),
    end: CalendarDateSchema.optional(),
  })
  .strict();

@Controller("insights")
export class InsightsController {
  constructor(@Inject(InsightsService) private readonly insights: InsightsService) {}

  /** `GET /api/insights?days=7|14&end=YYYY-MM-DD` — `end` defaults to today in Europe/Amsterdam. */
  @Get()
  get(
    @Query(new ZodValidationPipe(InsightsQuerySchema))
    query: z.output<typeof InsightsQuerySchema>,
  ) {
    return this.insights.forPeriod(query.days, query.end);
  }
}
