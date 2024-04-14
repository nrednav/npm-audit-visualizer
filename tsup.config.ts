import { defineConfig } from "tsup";

export default defineConfig({
  bundle: true,
  minify: true,
  target: "es2020",
  format: ["esm"],
  outDir: "./build/",
  onSuccess: "cp -r ./src/modules/WebApp/build/ ./build/web-app/",
});
