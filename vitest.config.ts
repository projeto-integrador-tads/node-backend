import { config } from "dotenv";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    maxConcurrency: 1,
    fileParallelism: false,
    passWithNoTests: true,
    globals: true,
    coverage: {
      provider: "v8",
      exclude: ["**/tests/**"],
    },
    env: {
      ...config({ path: "./env.test" }).parsed,
    },
  },
});
