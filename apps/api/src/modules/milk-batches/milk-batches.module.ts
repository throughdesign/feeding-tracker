import { Module } from "@nestjs/common";
import { MilkBatchesController } from "./milk-batches.controller.js";
import { MilkBatchesService } from "./milk-batches.service.js";

@Module({
  controllers: [MilkBatchesController],
  providers: [MilkBatchesService],
})
export class MilkBatchesModule {}
