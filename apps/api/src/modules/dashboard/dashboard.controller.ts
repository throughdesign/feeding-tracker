import { Controller, Get, Inject, Query } from "@nestjs/common";
import type { z } from "zod";
import { DateFilterQuerySchema } from "../../common/query.js";
import { ZodValidationPipe } from "../../common/zod-validation.pipe.js";
import { DashboardService } from "./dashboard.service.js";

@Controller("dashboard")
export class DashboardController {
  constructor(@Inject(DashboardService) private readonly dashboard: DashboardService) {}

  /** `GET /api/dashboard?date=YYYY-MM-DD` — defaults to today in Europe/Amsterdam. */
  @Get()
  get(
    @Query(new ZodValidationPipe(DateFilterQuerySchema))
    query: z.output<typeof DateFilterQuerySchema>,
  ) {
    return this.dashboard.forDate(query.date);
  }
}
