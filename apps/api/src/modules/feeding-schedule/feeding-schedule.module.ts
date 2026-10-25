import { Module } from "@nestjs/common";
import { FeedingScheduleController } from "./feeding-schedule.controller.js";
import { FeedingScheduleService } from "./feeding-schedule.service.js";

@Module({
  controllers: [FeedingScheduleController],
  providers: [FeedingScheduleService],
})
export class FeedingScheduleModule {}
