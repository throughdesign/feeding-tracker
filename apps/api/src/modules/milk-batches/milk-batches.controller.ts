import { Body, Controller, Get, Inject, Post } from "@nestjs/common";
import { CreateMilkBatchInputSchema } from "@isaac/shared";
import type { z } from "zod";
import { ZodValidationPipe } from "../../common/zod-validation.pipe.js";
import { MilkBatchesService } from "./milk-batches.service.js";

@Controller("milk-batches")
export class MilkBatchesController {
  constructor(@Inject(MilkBatchesService) private readonly batches: MilkBatchesService) {}

  @Get()
  list() {
    return this.batches.list();
  }

  @Post()
  create(
    @Body(new ZodValidationPipe(CreateMilkBatchInputSchema))
    body: z.output<typeof CreateMilkBatchInputSchema>,
  ) {
    return this.batches.create(body);
  }
}
