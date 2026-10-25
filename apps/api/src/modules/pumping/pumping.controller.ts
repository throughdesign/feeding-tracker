import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { CreatePumpingSessionInputSchema, UpdatePumpingSessionInputSchema } from "@isaac/shared";
import type { z } from "zod";
import { DateFilterQuerySchema, IdParamSchema } from "../../common/query.js";
import { ZodValidationPipe } from "../../common/zod-validation.pipe.js";
import { PumpingService } from "./pumping.service.js";

@Controller("pumping-sessions")
export class PumpingController {
  constructor(@Inject(PumpingService) private readonly pumping: PumpingService) {}

  @Get()
  list(
    @Query(new ZodValidationPipe(DateFilterQuerySchema))
    query: z.output<typeof DateFilterQuerySchema>,
  ) {
    return this.pumping.list(query);
  }

  @Get(":id")
  get(@Param("id", new ZodValidationPipe(IdParamSchema)) id: string) {
    return this.pumping.get(id);
  }

  @Post()
  create(
    @Body(new ZodValidationPipe(CreatePumpingSessionInputSchema))
    body: z.output<typeof CreatePumpingSessionInputSchema>,
  ) {
    return this.pumping.create(body);
  }

  @Patch(":id")
  update(
    @Param("id", new ZodValidationPipe(IdParamSchema)) id: string,
    @Body(new ZodValidationPipe(UpdatePumpingSessionInputSchema))
    body: z.output<typeof UpdatePumpingSessionInputSchema>,
  ) {
    return this.pumping.update(id, body);
  }

  @Delete(":id")
  @HttpCode(204)
  async remove(@Param("id", new ZodValidationPipe(IdParamSchema)) id: string) {
    await this.pumping.remove(id);
  }
}
