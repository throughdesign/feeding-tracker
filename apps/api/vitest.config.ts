import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts", "test/**/*.test.ts"],
    // Nest bootstrapping in integration tests can take a moment on cold starts.
    testTimeout: 15_000,
  },
});
