import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    outDir: "build",
  },
  plugins: [
    tsconfigPaths({
      projects: [
        path.resolve(__dirname, "tsconfig.json"),
        path.resolve(__dirname, "../../../tsconfig.json"),
      ],
    }),
    react(),
  ],
  resolve: {
    alias: {
      root: path.resolve(__dirname, "../../.."),
    },
  },
});
