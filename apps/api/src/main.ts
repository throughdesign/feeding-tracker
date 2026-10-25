import { Logger } from "@nestjs/common";
import { config } from "./config.js";
import { createApp } from "./create-app.js";
import { JsonFileStore } from "./persistence/json-file-store.js";

async function bootstrap() {
  const app = await createApp({ dataFile: config.dataFile });
  // Fail fast on a corrupt data file instead of on the first request.
  await app.get(JsonFileStore).read();
  await app.listen(config.port, config.host);
  const logger = new Logger("Bootstrap");
  logger.log(`API listening on http://${config.host}:${config.port}/api`);
  logger.log(`Data file: ${config.dataFile}`);
}

bootstrap().catch((error: unknown) => {
  new Logger("Bootstrap").error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
