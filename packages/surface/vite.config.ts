import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const sourceRoot = path.resolve(
  fileURLToPath(new URL("./src", import.meta.url)),
);

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [{ find: /^src\//, replacement: `${sourceRoot}/` }],
  },
  build: {
    outDir: "dist",
  },
});
