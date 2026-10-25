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
import { CreateFeedingSessionInputSchema, UpdateFeedingSessionInputSchema } from "@isaac/shared";
import type { z } from "zod";
import { FeedingListQuerySchema, IdParamSchema } from "../../common/query.js";
import { ZodValidationPipe } from "../../common/zod-validation.pipe.js";
import { FeedingService } from "./feeding.service.js";

@Controller("feedings")
export class FeedingController {
  constructor(@Inject(FeedingService) private readonly feedings: FeedingService) {}

  @Get()
  list(
    @Query(new ZodValidationPipe(FeedingListQuerySchema))
    query: z.output<typeof FeedingListQuerySchema>,
  ) {
    return this.feedings.list(query);
  }

  @Get(":id")
  get(@Param("id", new ZodValidationPipe(IdParamSchema)) id: string) {
    return this.feedings.get(id);
  }

  @Post()
  create(
    @Body(new ZodValidationPipe(CreateFeedingSessionInputSchema))
    body: z.output<typeof CreateFeedingSessionInputSchema>,
  ) {
    return this.feedings.create(body);
  }

  @Patch(":id")
  update(
    @Param("id", new ZodValidationPipe(IdParamSchema)) id: string,
    @Body(new ZodValidationPipe(UpdateFeedingSessionInputSchema))
    body: z.output<typeof UpdateFeedingSessionInputSchema>,
  ) {
    return this.feedings.update(id, body);
  }

  @Delete(":id")
  @HttpCode(204)
  async remove(@Param("id", new ZodValidationPipe(IdParamSchema)) id: string) {
    await this.feedings.remove(id);
  }
}
