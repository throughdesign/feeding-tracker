import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { AppModule } from "./app.module.js";
import { ApiExceptionFilter } from "./common/api-exception.filter.js";

export async function createApp(options: { dataFile: string; logger?: false }) {
  const app = await NestFactory.create<NestExpressApplication>(AppModule.forRoot(options), {
    logger: options.logger,
  });
  app.setGlobalPrefix("api");
  app.useGlobalFilters(new ApiExceptionFilter());
  app.useBodyParser("json", { limit: "100kb" });
  app.disable("x-powered-by");
  app.enableShutdownHooks();
  return app;
}
