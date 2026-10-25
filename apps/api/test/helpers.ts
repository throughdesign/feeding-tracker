import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export async function tempDataFile() {
  const dir = await mkdtemp(join(tmpdir(), "isaac-feeding-test-"));
  return {
    dir,
    file: join(dir, "feeding.json"),
    cleanup: () => rm(dir, { recursive: true, force: true }),
  };
}
