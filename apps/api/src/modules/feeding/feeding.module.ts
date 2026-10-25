import { Module } from "@nestjs/common";
import { FeedingController } from "./feeding.controller.js";
import { FeedingService } from "./feeding.service.js";

@Module({
  controllers: [FeedingController],
  providers: [FeedingService],
  exports: [FeedingService],
})
export class FeedingModule {}
