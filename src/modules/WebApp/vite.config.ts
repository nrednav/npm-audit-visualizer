/// <reference types="vitest" />
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    outDir: "build",
  },
  resolve: {
    alias: {
      src: "/src",
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: "./setupTests.ts",
  },
  plugins: [react()],
});
