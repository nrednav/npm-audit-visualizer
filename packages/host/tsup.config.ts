import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/main.ts"],
  bundle: true,
  minify: true,
  target: "node20",
  format: ["esm"],
  outDir: "./dist",
  clean: true,
  banner: { js: "#!/usr/bin/env node" },
});
