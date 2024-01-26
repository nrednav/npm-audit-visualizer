/// <reference types="vitest" />
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    exclude: [...configDefaults.exclude, "src/web-app/**/*"],
    passWithNoTests: true,
  },
});
