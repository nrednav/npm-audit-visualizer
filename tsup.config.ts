import { defineConfig } from "tsup";

export default defineConfig({
  bundle: true,
  minify: true,
  target: "es2020",
  format: ["esm"],
  outDir: "./build/",
  onSuccess: "cp -r ./src/modules/web-app/build/ ./build/web-app/",
});
