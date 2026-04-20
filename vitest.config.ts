import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    exclude: process.env["TEST_LIVE_GITHUB"] === "1"
      ? ["**/node_modules/**"]
      : ["**/node_modules/**", "tests/live/**"],
  },
});
