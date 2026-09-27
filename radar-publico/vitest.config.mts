import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    env: {
      DATABASE_URL: process.env.TEST_DATABASE_URL ?? "postgres://radar:radar@localhost:5432/radar_publico_test",
      PNCP_MIN_INTERVAL_MS: "0",
    },
    include: ["tests/**/*.test.ts"],
    // DB-backed suites share one test database.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
