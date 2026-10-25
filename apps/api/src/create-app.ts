import "reflect-metadata";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
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

  // Serve the compiled React SPA for all non-API routes
  const webDist = resolve(import.meta.dirname, "../../web/dist");
  if (existsSync(webDist)) {
    app.useStaticAssets(webDist);
    // SPA fallback: serve index.html for routes that are not /api/...
    app.use((req: any, res: any, next: any) => {
      if (req.path.startsWith("/api")) {
        next();
      } else {
        res.sendFile("index.html", { root: webDist });
      }
    });
  }

  return app;
}
