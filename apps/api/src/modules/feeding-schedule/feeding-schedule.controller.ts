import { Body, Controller, Get, Inject, Patch } from "@nestjs/common";
import { UpdateFeedingScheduleSettingsInputSchema } from "@isaac/shared";
import type { z } from "zod";
import { ZodValidationPipe } from "../../common/zod-validation.pipe.js";
import { FeedingScheduleService } from "./feeding-schedule.service.js";

@Controller("feeding-schedule")
export class FeedingScheduleController {
  constructor(@Inject(FeedingScheduleService) private readonly schedule: FeedingScheduleService) {}

  /** `GET /api/feeding-schedule` — settings and the derived next feeding. */
  @Get()
  get() {
    return this.schedule.get();
  }

  /** `PATCH /api/feeding-schedule/settings` — partial settings update. */
  @Patch("settings")
  updateSettings(
    @Body(new ZodValidationPipe(UpdateFeedingScheduleSettingsInputSchema))
    body: z.output<typeof UpdateFeedingScheduleSettingsInputSchema>,
  ) {
    return this.schedule.updateSettings(body);
  }
}
