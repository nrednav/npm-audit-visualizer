import tsconfigPaths from "vite-tsconfig-paths";
/// <reference types="vitest" />
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "jsdom",
    setupFiles: "./setupTests.ts",
  },
});
