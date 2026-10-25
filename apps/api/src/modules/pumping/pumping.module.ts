import { Module } from "@nestjs/common";
import { PumpingController } from "./pumping.controller.js";
import { PumpingService } from "./pumping.service.js";

@Module({
  controllers: [PumpingController],
  providers: [PumpingService],
  exports: [PumpingService],
})
export class PumpingModule {}
