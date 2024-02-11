import tsconfigPaths from "vite-tsconfig-paths";
/// <reference types="vitest" />
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    exclude: [...configDefaults.exclude, "web-app/**/*"],
    passWithNoTests: true,
  },
});
