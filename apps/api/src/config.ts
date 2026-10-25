import { resolve } from "node:path";

/** Repository root, resolved from this file (works for both `src/` and `dist/`). */
const repoRoot = resolve(import.meta.dirname, "../../..");

export const config = {
  /** Loopback only by default: this API has no authentication. */
  host: process.env.HOST ?? "127.0.0.1",
  port: Number(process.env.PORT ?? 3001),
  dataFile: resolve(process.env.DATA_FILE ?? resolve(repoRoot, "data/feeding.json")),
};
