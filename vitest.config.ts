import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    exclude: process.env["TEST_LIVE_GITHUB"] === "1"
      ? ["**/node_modules/**"]
      : ["**/node_modules/**", "tests/live/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["src/**/*.ts"],
      exclude: ["src/index.ts", "src/cli.ts"],
      thresholds: {
        lines: 85,
        branches: 80,
        functions: 90,
        statements: 85,
      },
    },
  },
});
