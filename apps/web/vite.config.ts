import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const apiTarget = process.env.API_URL ?? "http://127.0.0.1:3001";

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Consume the shared package from source for instant HMR.
    alias: {
      "@isaac/shared": fileURLToPath(
        new URL("../../packages/shared/src/index.ts", import.meta.url),
      ),
    },
  },
  // The data file lives in ../../data and is never served: Vite only serves this
  // app's own sources and the (empty) public directory.
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
    proxy: { "/api": { target: apiTarget, changeOrigin: false } },
    fs: { strict: true, deny: [".env", ".env.*", "**/data/**"] },
  },
  preview: {
    host: "127.0.0.1",
    proxy: { "/api": { target: apiTarget } },
  },
});
