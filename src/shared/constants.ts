import path from "node:path";
import { fileURLToPath } from "node:url";

export const PACKAGE_NAME = "npm-audit-visualizer";

// Source runs from src/shared. The bundled CLI runs from build. Resolve the
// package root without require.resolve(PACKAGE_NAME), which requires the
// build/main.js entrypoint to exist before development commands can start.
const CURRENT_DIR = path.dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT =
  path.basename(CURRENT_DIR) === "shared"
    ? path.resolve(CURRENT_DIR, "../..")
    : path.resolve(CURRENT_DIR, "..");

export const PACKAGE_ENTRY_POINT = {
  relative: "build/main.js",
  absolute: path.join(PACKAGE_ROOT, "build/main.js"),
};

export const WEB_APP_BUILD_DIR = path.join(PACKAGE_ROOT, "build/web-app");
