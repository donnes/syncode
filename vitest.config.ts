import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    // Each test spawns the real CLI against a sandbox home folder.
    testTimeout: 20_000,
  },
});
